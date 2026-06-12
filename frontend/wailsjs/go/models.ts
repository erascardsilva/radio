export namespace main {
	
	export class Station {
	    name: string;
	    url: string;
	    freq: string;
	
	    static createFrom(source: any = {}) {
	        return new Station(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.url = source["url"];
	        this.freq = source["freq"];
	    }
	}

}

