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
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// TaskTemplate represents a task that can be checked off daily
type TaskTemplate struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Type      string  `json:"type,omitempty"` // "binary" (default) or "count"
	Order     int     `json:"order"`
	CreatedAt string  `json:"createdAt"`
	DeletedAt *string `json:"deletedAt,omitempty"`
}

// PlannerData is the root data structure for storage
type PlannerData struct {
	Templates     []TaskTemplate      `json:"templates"`
	Days          map[string]DayTasks `json:"days"`
	ExportPath    string              `json:"exportPath,omitempty"`
	ExportHistory map[string]string   `json:"exportHistory,omitempty"` // weekStart -> exportedDate
}

// DayTasks maps task IDs to numeric value.
// - binary habits: 0/1
// - count habits: 0..N
type DayTasks map[string]int

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
			Templates:     []TaskTemplate{},
			Days:          make(map[string]DayTasks),
			ExportHistory: make(map[string]string),
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

	// Detect format safely.
	// Unmarshalling old-format data into PlannerData succeeds with empty fields,
	// so we look for known top-level keys before choosing the new format.
	var root map[string]json.RawMessage
	if err := json.Unmarshal(data, &root); err == nil {
		_, hasTemplates := root["templates"]
		_, hasDays := root["days"]
		_, hasExportPath := root["exportPath"]
		_, hasExportHistory := root["exportHistory"]

		if hasTemplates || hasDays || hasExportPath || hasExportHistory {
			// We intentionally parse Days as a loose map to support older saved data
			// where day values were booleans.
			type plannerDataWire struct {
				Templates     []TaskTemplate              `json:"templates"`
				Days          map[string]map[string]any   `json:"days"`
				ExportPath    string                      `json:"exportPath,omitempty"`
				ExportHistory map[string]string           `json:"exportHistory,omitempty"`
			}

			var wire plannerDataWire
			if err := json.Unmarshal(data, &wire); err == nil {
				convertedDays := make(map[string]DayTasks)
				for date, taskMap := range wire.Days {
					dayTasks := make(DayTasks)
					for id, raw := range taskMap {
						switch v := raw.(type) {
						case bool:
							if v {
								dayTasks[id] = 1
							} else {
								dayTasks[id] = 0
							}
						case float64:
							dayTasks[id] = int(v)
						case int:
							dayTasks[id] = v
						default:
							// Ignore unsupported values
						}
					}
					convertedDays[date] = dayTasks
				}

				// Default type for older templates.
				for i := range wire.Templates {
					if wire.Templates[i].Type == "" {
						wire.Templates[i].Type = "binary"
					}
				}

				a.data = PlannerData{
					Templates:     wire.Templates,
					Days:          convertedDays,
					ExportPath:    wire.ExportPath,
					ExportHistory: wire.ExportHistory,
				}
				if a.data.Days == nil {
					a.data.Days = make(map[string]DayTasks)
				}
				if a.data.ExportHistory == nil {
					a.data.ExportHistory = make(map[string]string)
				}
				return
			}
		}
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
		{ID: "task-1", Name: "Task 1", Type: "binary", Order: 0, CreatedAt: today},
		{ID: "task-2", Name: "Task 2", Type: "binary", Order: 1, CreatedAt: today},
		{ID: "task-3", Name: "Task 3", Type: "binary", Order: 2, CreatedAt: today},
		{ID: "task-4", Name: "Task 4", Type: "binary", Order: 3, CreatedAt: today},
	}

	// Convert old data
	newDays := make(map[string]DayTasks)
	for date, tasks := range oldFormat {
		dayTasks := make(DayTasks)
		for i, completed := range tasks {
			if i < len(defaultTasks) {
				if completed {
					dayTasks[defaultTasks[i].ID] = 1
				} else {
					dayTasks[defaultTasks[i].ID] = 0
				}
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
		{ID: uuid.New().String(), Name: "Morning Routine", Type: "binary", Order: 0, CreatedAt: today},
		{ID: uuid.New().String(), Name: "Deep Work", Type: "binary", Order: 1, CreatedAt: today},
		{ID: uuid.New().String(), Name: "Exercise", Type: "binary", Order: 2, CreatedAt: today},
		{ID: uuid.New().String(), Name: "Evening Review", Type: "binary", Order: 3, CreatedAt: today},
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
	return a.atomicWriteFile(a.dataPath, data)
}

// atomicWriteFile writes data to a temporary file first, then renames it
// This prevents data corruption on power loss or crash
func (a *App) atomicWriteFile(filename string, data []byte) error {
	dir := filepath.Dir(filename)
	tmpFile, err := os.CreateTemp(dir, "plan-tmp-*.json")
	if err != nil {
		return err
	}
	tmpPath := tmpFile.Name()

	// Write data
	if _, err := tmpFile.Write(data); err != nil {
		tmpFile.Close()
		os.Remove(tmpPath)
		return err
	}

	// Sync ensures physical write to disk
	if err := tmpFile.Sync(); err != nil {
		tmpFile.Close()
		os.Remove(tmpPath)
		return err
	}

	if err := tmpFile.Close(); err != nil {
		os.Remove(tmpPath)
		return err
	}

	// Atomic rename on Unix; on Windows, os.Rename fails if destination exists.
	renameErr := os.Rename(tmpPath, filename)
	if renameErr == nil {
		return nil
	}

	// If the destination exists, try remove+rename as a best-effort fallback.
	if _, statErr := os.Stat(filename); statErr == nil {
		if removeErr := os.Remove(filename); removeErr == nil || os.IsNotExist(removeErr) {
			if err2 := os.Rename(tmpPath, filename); err2 == nil {
				return nil
			} else {
				renameErr = err2
			}
		}
	}

	os.Remove(tmpPath)
	return renameErr
}

// GetTaskTemplates returns all active task templates
func (a *App) GetTaskTemplates() []TaskTemplate {
	a.mu.RLock()
	defer a.mu.RUnlock()

	var active []TaskTemplate
	for _, t := range a.data.Templates {
		if t.Type == "" {
			t.Type = "binary"
		}
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
		if t.Type == "" {
			t.Type = "binary"
		}
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
func (a *App) AddTask(name string, taskType string) (TaskTemplate, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	if taskType == "" {
		taskType = "binary"
	}
	if taskType != "binary" && taskType != "count" {
		taskType = "binary"
	}

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
		Type:      taskType,
		Order:     maxOrder + 1,
		CreatedAt: time.Now().Format("2006-01-02"),
	}

	a.data.Templates = append(a.data.Templates, task)
	a.saveDataLocked()

	return task, nil
}

// SetTaskType updates a task's type ("binary" or "count").
func (a *App) SetTaskType(id string, taskType string) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if taskType == "" {
		taskType = "binary"
	}
	if taskType != "binary" && taskType != "count" {
		return nil
	}

	for i, t := range a.data.Templates {
		if t.ID == id {
			a.data.Templates[i].Type = taskType
			return a.saveDataLocked()
		}
	}

	return nil
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
func (a *App) LoadDay(date string) map[string]int {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if tasks, ok := a.data.Days[date]; ok {
		result := make(map[string]int)
		for k, v := range tasks {
			result[k] = v
		}
		return result
	}

	return make(map[string]int)
}

// SaveDay saves task completion status for a specific date
func (a *App) SaveDay(date string, tasks map[string]int) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.data.Days == nil {
		a.data.Days = make(map[string]DayTasks)
	}

	a.data.Days[date] = tasks
	return a.saveDataLocked()
}

// LoadWeek returns task data for a week starting from the given date
func (a *App) LoadWeek(startDate string) map[string]map[string]int {
	a.mu.RLock()
	defer a.mu.RUnlock()

	result := make(map[string]map[string]int)

	t, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return result
	}

	for i := 0; i < 7; i++ {
		date := t.AddDate(0, 0, i)
		dateKey := date.Format("2006-01-02")

		if tasks, ok := a.data.Days[dateKey]; ok {
			taskCopy := make(map[string]int)
			for k, v := range tasks {
				taskCopy[k] = v
			}
			result[dateKey] = taskCopy
		} else {
			result[dateKey] = make(map[string]int)
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
				typeVal := task.Type
				if typeVal == "" {
					typeVal = "binary"
				}
				if typeVal == "binary" || typeVal == "count" {
					if dayTasks[task.ID] > 0 {
						completed++
					}
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
						typeVal := task.Type
						if typeVal == "" {
							typeVal = "binary"
						}
						if typeVal == "binary" || typeVal == "count" {
							if dayTasks[task.ID] > 0 {
								completed++
							}
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
						typeVal := task.Type
						if typeVal == "" {
							typeVal = "binary"
						}
						if typeVal == "binary" || typeVal == "count" {
							if dayTasks[task.ID] > 0 {
								completed++
							}
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
	// Check export path setting or default
	a.mu.RLock()
	exportDir := a.data.ExportPath
	a.mu.RUnlock()
	if exportDir == "" {
		homeDir, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		exportDir = filepath.Join(homeDir, "Downloads")
	}

	// Create PLAN_Exports subfolder
	finalDir := filepath.Join(exportDir, "PLAN_Exports")
	if err := os.MkdirAll(finalDir, 0755); err != nil {
		return "", err
	}

	downloadsPath := filepath.Join(finalDir, filename)

	if err := a.atomicWriteFile(downloadsPath, []byte(htmlContent)); err != nil {
		return "", err
	}

	return downloadsPath, nil
}

// SetExportPath updates the export directory
func (a *App) SetExportPath(path string) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	a.data.ExportPath = path
	return a.saveDataLocked()
}

// GetExportPath returns the current export directory
func (a *App) GetExportPath() string {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.data.ExportPath
}

// MarkWeekExported records that a week has been exported
func (a *App) MarkWeekExported(weekStart string) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.data.ExportHistory == nil {
		a.data.ExportHistory = make(map[string]string)
	}

	a.data.ExportHistory[weekStart] = time.Now().Format("2006-01-02")
	return a.saveDataLocked()
}

// IsWeekExported checks if a week has already been exported
func (a *App) IsWeekExported(weekStart string) bool {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if a.data.ExportHistory == nil {
		return false
	}

	_, exists := a.data.ExportHistory[weekStart]
	return exists
}

// SelectDirectory opens a native dialog to select a folder
func (a *App) SelectDirectory() (string, error) {
	selection, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Export Folder",
	})
	if err != nil {
		return "", err
	}
	return selection, nil
}
