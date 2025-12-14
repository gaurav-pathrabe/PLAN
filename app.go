package main

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"
)

// TaskTemplate represents a task that can be checked off daily
type TaskTemplate struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Order     int     `json:"order"`
	CreatedAt string  `json:"createdAt"`
	DeletedAt *string `json:"deletedAt,omitempty"`
}

// PlannerData is the root data structure for storage
type PlannerData struct {
	Templates []TaskTemplate      `json:"templates"`
	Days      map[string]DayTasks `json:"days"`
}

// DayTasks maps task IDs to completion status
type DayTasks map[string]bool

// App struct holds the application state
type App struct {
	ctx      context.Context
	dataPath string
	data     PlannerData
	mu       sync.RWMutex
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		data: PlannerData{
			Templates: []TaskTemplate{},
			Days:      make(map[string]DayTasks),
		},
	}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Set up data directory in user's home
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "."
	}

	dataDir := filepath.Join(homeDir, ".plan")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		println("Error creating data directory:", err.Error())
	}

	a.dataPath = filepath.Join(dataDir, "data.json")

	// Load existing data
	a.loadData()

	// Migrate old format if needed
	a.migrateOldData()

	// Create default tasks if none exist
	if len(a.data.Templates) == 0 {
		a.createDefaultTasks()
	}
}

// loadData loads planner data from the JSON file
func (a *App) loadData() {
	a.mu.Lock()
	defer a.mu.Unlock()

	data, err := os.ReadFile(a.dataPath)
	if err != nil {
		return
	}

	// Try new format first
	var newFormat PlannerData
	if err := json.Unmarshal(data, &newFormat); err == nil && len(newFormat.Templates) > 0 {
		a.data = newFormat
		if a.data.Days == nil {
			a.data.Days = make(map[string]DayTasks)
		}
		return
	}

	// Try old format (map[string][]bool)
	var oldFormat map[string][]bool
	if err := json.Unmarshal(data, &oldFormat); err == nil {
		a.data.Days = make(map[string]DayTasks)
		// Will be migrated in migrateOldData
	}
}

// migrateOldData converts old format to new format
func (a *App) migrateOldData() {
	a.mu.Lock()
	defer a.mu.Unlock()

	// Check if we need to read old format
	data, err := os.ReadFile(a.dataPath)
	if err != nil {
		return
	}

	var oldFormat map[string][]bool
	if err := json.Unmarshal(data, &oldFormat); err != nil {
		return
	}

	// Skip if no old data or already migrated
	if len(oldFormat) == 0 {
		return
	}

	// Check if this is actually old format (has array values)
	hasOldData := false
	for _, v := range oldFormat {
		if len(v) > 0 {
			hasOldData = true
			break
		}
	}

	if !hasOldData {
		return
	}

	// Create default templates for migration
	today := time.Now().Format("2006-01-02")
	defaultTasks := []TaskTemplate{
		{ID: "task-1", Name: "Task 1", Order: 0, CreatedAt: today},
		{ID: "task-2", Name: "Task 2", Order: 1, CreatedAt: today},
		{ID: "task-3", Name: "Task 3", Order: 2, CreatedAt: today},
		{ID: "task-4", Name: "Task 4", Order: 3, CreatedAt: today},
	}

	// Convert old data
	newDays := make(map[string]DayTasks)
	for date, tasks := range oldFormat {
		dayTasks := make(DayTasks)
		for i, completed := range tasks {
			if i < len(defaultTasks) {
				dayTasks[defaultTasks[i].ID] = completed
			}
		}
		newDays[date] = dayTasks
	}

	a.data = PlannerData{
		Templates: defaultTasks,
		Days:      newDays,
	}

	a.saveDataLocked()
}

// createDefaultTasks creates initial default tasks
func (a *App) createDefaultTasks() {
	a.mu.Lock()
	defer a.mu.Unlock()

	today := time.Now().Format("2006-01-02")
	a.data.Templates = []TaskTemplate{
		{ID: uuid.New().String(), Name: "Morning Routine", Order: 0, CreatedAt: today},
		{ID: uuid.New().String(), Name: "Deep Work", Order: 1, CreatedAt: today},
		{ID: uuid.New().String(), Name: "Exercise", Order: 2, CreatedAt: today},
		{ID: uuid.New().String(), Name: "Evening Review", Order: 3, CreatedAt: today},
	}

	a.saveDataLocked()
}

// saveData persists data to JSON file (public, acquires lock)
func (a *App) saveData() error {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.saveDataLocked()
}

// saveDataLocked persists data (must be called with lock held)
func (a *App) saveDataLocked() error {
	data, err := json.MarshalIndent(a.data, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(a.dataPath, data, 0644)
}

// GetTaskTemplates returns all active task templates
func (a *App) GetTaskTemplates() []TaskTemplate {
	a.mu.RLock()
	defer a.mu.RUnlock()

	var active []TaskTemplate
	for _, t := range a.data.Templates {
		if t.DeletedAt == nil {
			active = append(active, t)
		}
	}

	sort.Slice(active, func(i, j int) bool {
		return active[i].Order < active[j].Order
	})

	return active
}

// GetTasksForDate returns tasks valid for a specific date
func (a *App) GetTasksForDate(date string) []TaskTemplate {
	a.mu.RLock()
	defer a.mu.RUnlock()

	var tasks []TaskTemplate
	for _, t := range a.data.Templates {
		// Include if created on or before this date
		if t.CreatedAt <= date {
			// Exclude if deleted before this date
			if t.DeletedAt == nil || *t.DeletedAt > date {
				tasks = append(tasks, t)
			}
		}
	}

	sort.Slice(tasks, func(i, j int) bool {
		return tasks[i].Order < tasks[j].Order
	})

	return tasks
}

// AddTask creates a new task template
func (a *App) AddTask(name string) (TaskTemplate, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	// Find max order
	maxOrder := -1
	for _, t := range a.data.Templates {
		if t.Order > maxOrder {
			maxOrder = t.Order
		}
	}

	task := TaskTemplate{
		ID:        uuid.New().String(),
		Name:      name,
		Order:     maxOrder + 1,
		CreatedAt: time.Now().Format("2006-01-02"),
	}

	a.data.Templates = append(a.data.Templates, task)
	a.saveDataLocked()

	return task, nil
}

// UpdateTask renames a task
func (a *App) UpdateTask(id, name string) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	for i, t := range a.data.Templates {
		if t.ID == id {
			a.data.Templates[i].Name = name
			return a.saveDataLocked()
		}
	}

	return nil
}

// DeleteTask soft-deletes a task (only affects future dates)
func (a *App) DeleteTask(id string) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	today := time.Now().Format("2006-01-02")
	for i, t := range a.data.Templates {
		if t.ID == id {
			a.data.Templates[i].DeletedAt = &today
			return a.saveDataLocked()
		}
	}

	return nil
}

// ReorderTasks updates the order of tasks
func (a *App) ReorderTasks(ids []string) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	orderMap := make(map[string]int)
	for i, id := range ids {
		orderMap[id] = i
	}

	for i, t := range a.data.Templates {
		if order, ok := orderMap[t.ID]; ok {
			a.data.Templates[i].Order = order
		}
	}

	return a.saveDataLocked()
}

// LoadDay returns task completion status for a specific date
func (a *App) LoadDay(date string) map[string]bool {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if tasks, ok := a.data.Days[date]; ok {
		result := make(map[string]bool)
		for k, v := range tasks {
			result[k] = v
		}
		return result
	}

	return make(map[string]bool)
}

// SaveDay saves task completion status for a specific date
func (a *App) SaveDay(date string, tasks map[string]bool) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.data.Days == nil {
		a.data.Days = make(map[string]DayTasks)
	}

	a.data.Days[date] = tasks
	return a.saveDataLocked()
}

// LoadWeek returns task data for a week starting from the given date
func (a *App) LoadWeek(startDate string) map[string]map[string]bool {
	a.mu.RLock()
	defer a.mu.RUnlock()

	result := make(map[string]map[string]bool)

	t, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return result
	}

	for i := 0; i < 7; i++ {
		date := t.AddDate(0, 0, i)
		dateKey := date.Format("2006-01-02")

		if tasks, ok := a.data.Days[dateKey]; ok {
			taskCopy := make(map[string]bool)
			for k, v := range tasks {
				taskCopy[k] = v
			}
			result[dateKey] = taskCopy
		} else {
			result[dateKey] = make(map[string]bool)
		}
	}

	return result
}

// GetWeeklyReport calculates daily completion percentages for a week
func (a *App) GetWeeklyReport(startDate string) map[string]interface{} {
	a.mu.RLock()
	defer a.mu.RUnlock()

	result := map[string]interface{}{
		"dailyPercentages": []float64{},
		"weeklyAverage":    0.0,
	}

	t, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return result
	}

	dailyPercentages := make([]float64, 7)
	total := 0.0

	for i := 0; i < 7; i++ {
		date := t.AddDate(0, 0, i)
		dateKey := date.Format("2006-01-02")

		// Get tasks valid for this date
		tasksForDate := a.getTasksForDateLocked(dateKey)
		taskCount := len(tasksForDate)

		if taskCount == 0 {
			continue
		}

		if dayTasks, ok := a.data.Days[dateKey]; ok {
			completed := 0
			for _, task := range tasksForDate {
				if dayTasks[task.ID] {
					completed++
				}
			}
			percentage := float64(completed) / float64(taskCount) * 100.0
			dailyPercentages[i] = percentage
			total += percentage
		}
	}

	result["dailyPercentages"] = dailyPercentages
	result["weeklyAverage"] = total / 7.0

	return result
}

// getTasksForDateLocked returns tasks for a date (must hold lock)
func (a *App) getTasksForDateLocked(date string) []TaskTemplate {
	var tasks []TaskTemplate
	for _, t := range a.data.Templates {
		if t.CreatedAt <= date {
			if t.DeletedAt == nil || *t.DeletedAt > date {
				tasks = append(tasks, t)
			}
		}
	}
	return tasks
}

// GetMonthlyReport calculates weekly averages for a given month
func (a *App) GetMonthlyReport(year int, month int) map[string]interface{} {
	a.mu.RLock()
	defer a.mu.RUnlock()

	result := map[string]interface{}{
		"weeklyAverages": []float64{},
		"monthName":      time.Month(month).String(),
		"trendDirection": "stable",
	}

	firstDay := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	lastDay := firstDay.AddDate(0, 1, -1)

	weeklyAverages := []float64{}
	currentDay := firstDay

	for currentDay.Before(lastDay) || currentDay.Equal(lastDay) {
		weekTotal := 0.0
		daysInWeek := 0

		for i := 0; i < 7 && (currentDay.Before(lastDay) || currentDay.Equal(lastDay)); i++ {
			dateKey := currentDay.Format("2006-01-02")
			tasksForDate := a.getTasksForDateLocked(dateKey)
			taskCount := len(tasksForDate)

			if taskCount > 0 {
				if dayTasks, ok := a.data.Days[dateKey]; ok {
					completed := 0
					for _, task := range tasksForDate {
						if dayTasks[task.ID] {
							completed++
						}
					}
					weekTotal += float64(completed) / float64(taskCount) * 100.0
				}
			}
			daysInWeek++
			currentDay = currentDay.AddDate(0, 0, 1)
		}

		if daysInWeek > 0 {
			weeklyAverages = append(weeklyAverages, weekTotal/float64(daysInWeek))
		}
	}

	result["weeklyAverages"] = weeklyAverages

	if len(weeklyAverages) >= 2 {
		first := weeklyAverages[0]
		last := weeklyAverages[len(weeklyAverages)-1]
		if last > first+10 {
			result["trendDirection"] = "up"
		} else if last < first-10 {
			result["trendDirection"] = "down"
		}
	}

	return result
}

// GetYearlyReport calculates monthly averages for a given year
func (a *App) GetYearlyReport(year int) map[string]interface{} {
	a.mu.RLock()
	defer a.mu.RUnlock()

	result := map[string]interface{}{
		"monthlyAverages":     make([]float64, 12),
		"mostConsistentMonth": 0,
		"yearTotal":           0.0,
	}

	monthlyAverages := make([]float64, 12)
	monthlyVariances := make([]float64, 12)
	yearTotal := 0.0
	validMonths := 0

	for month := 1; month <= 12; month++ {
		firstDay := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
		lastDay := firstDay.AddDate(0, 1, -1)

		dailyPercentages := []float64{}
		currentDay := firstDay

		for currentDay.Before(lastDay) || currentDay.Equal(lastDay) {
			dateKey := currentDay.Format("2006-01-02")
			tasksForDate := a.getTasksForDateLocked(dateKey)
			taskCount := len(tasksForDate)

			if taskCount > 0 {
				if dayTasks, ok := a.data.Days[dateKey]; ok {
					completed := 0
					for _, task := range tasksForDate {
						if dayTasks[task.ID] {
							completed++
						}
					}
					dailyPercentages = append(dailyPercentages, float64(completed)/float64(taskCount)*100.0)
				}
			}
			currentDay = currentDay.AddDate(0, 0, 1)
		}

		if len(dailyPercentages) > 0 {
			sum := 0.0
			for _, p := range dailyPercentages {
				sum += p
			}
			avg := sum / float64(len(dailyPercentages))
			monthlyAverages[month-1] = avg
			yearTotal += avg
			validMonths++

			variance := 0.0
			for _, p := range dailyPercentages {
				diff := p - avg
				variance += diff * diff
			}
			monthlyVariances[month-1] = variance / float64(len(dailyPercentages))
		}
	}

	mostConsistent := 0
	lowestVariance := -1.0
	for i, variance := range monthlyVariances {
		if monthlyAverages[i] > 0 && (lowestVariance < 0 || variance < lowestVariance) {
			lowestVariance = variance
			mostConsistent = i
		}
	}

	result["monthlyAverages"] = monthlyAverages
	result["mostConsistentMonth"] = mostConsistent
	if validMonths > 0 {
		result["yearTotal"] = yearTotal / float64(validMonths)
	}

	return result
}

// SaveHTMLExport saves HTML content to Downloads folder
func (a *App) SaveHTMLExport(filename string, htmlContent string) (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	downloadsPath := filepath.Join(homeDir, "Downloads", filename)
	
	err = os.WriteFile(downloadsPath, []byte(htmlContent), 0644)
	if err != nil {
		return "", err
	}

	return downloadsPath, nil
}
