export namespace main {
	
	export class TaskTemplate {
	    id: string;
	    name: string;
	    type?: string;
	    unit?: string;
	    order: number;
	    createdAt: string;
	    deletedAt?: string;
	
	    static createFrom(source: any = {}) {
	        return new TaskTemplate(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.type = source["type"];
	        this.unit = source["unit"];
	        this.order = source["order"];
	        this.createdAt = source["createdAt"];
	        this.deletedAt = source["deletedAt"];
	    }
	}

}

