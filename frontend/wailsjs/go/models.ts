export namespace github {
	
	export class DeviceFlowResult {
	    deviceCode: string;
	    userCode: string;
	    verificationUri: string;
	    expiresIn: number;
	    interval: number;
	
	    static createFrom(source: any = {}) {
	        return new DeviceFlowResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.deviceCode = source["deviceCode"];
	        this.userCode = source["userCode"];
	        this.verificationUri = source["verificationUri"];
	        this.expiresIn = source["expiresIn"];
	        this.interval = source["interval"];
	    }
	}

}

export namespace graph {
	
	export class Edge {
	    source: string;
	    target: string;
	
	    static createFrom(source: any = {}) {
	        return new Edge(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.source = source["source"];
	        this.target = source["target"];
	    }
	}
	export class UserNode {
	    login: string;
	    id: number;
	    avatarUrl: string;
	    name: string;
	    bio: string;
	    company: string;
	    location: string;
	    followers: number;
	    following: number;
	    depth: number;
	
	    static createFrom(source: any = {}) {
	        return new UserNode(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.login = source["login"];
	        this.id = source["id"];
	        this.avatarUrl = source["avatarUrl"];
	        this.name = source["name"];
	        this.bio = source["bio"];
	        this.company = source["company"];
	        this.location = source["location"];
	        this.followers = source["followers"];
	        this.following = source["following"];
	        this.depth = source["depth"];
	    }
	}
	export class FollowListResult {
	    followers: UserNode[];
	    following: UserNode[];
	
	    static createFrom(source: any = {}) {
	        return new FollowListResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.followers = this.convertValues(source["followers"], UserNode);
	        this.following = this.convertValues(source["following"], UserNode);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Graph {
	    nodes: UserNode[];
	    edges: Edge[];
	    centerUser: string;
	    maxDepth: number;
	
	    static createFrom(source: any = {}) {
	        return new Graph(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.nodes = this.convertValues(source["nodes"], UserNode);
	        this.edges = this.convertValues(source["edges"], Edge);
	        this.centerUser = source["centerUser"];
	        this.maxDepth = source["maxDepth"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class GraphStats {
	    totalNodes: number;
	    totalEdges: number;
	    mutualFollows: number;
	    nodesByDepth: Record<number, number>;
	    topFollowed: UserNode[];
	    topFollowing: UserNode[];
	    avgFollowers: number;
	    avgFollowing: number;
	
	    static createFrom(source: any = {}) {
	        return new GraphStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalNodes = source["totalNodes"];
	        this.totalEdges = source["totalEdges"];
	        this.mutualFollows = source["mutualFollows"];
	        this.nodesByDepth = source["nodesByDepth"];
	        this.topFollowed = this.convertValues(source["topFollowed"], UserNode);
	        this.topFollowing = this.convertValues(source["topFollowing"], UserNode);
	        this.avgFollowers = source["avgFollowers"];
	        this.avgFollowing = source["avgFollowing"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class MutualFollowResult {
	    userA: string;
	    userB: string;
	    mutualUsers: UserNode[];
	    count: number;
	
	    static createFrom(source: any = {}) {
	        return new MutualFollowResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.userA = source["userA"];
	        this.userB = source["userB"];
	        this.mutualUsers = this.convertValues(source["mutualUsers"], UserNode);
	        this.count = source["count"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace main {
	
	export class AuthStatus {
	    isAuthenticated: boolean;
	    user?: graph.UserNode;
	
	    static createFrom(source: any = {}) {
	        return new AuthStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.isAuthenticated = source["isAuthenticated"];
	        this.user = this.convertValues(source["user"], graph.UserNode);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class OAuthPollResult {
	    done: boolean;
	    error: string;
	
	    static createFrom(source: any = {}) {
	        return new OAuthPollResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.done = source["done"];
	        this.error = source["error"];
	    }
	}
	export class RateLimitInfo {
	    remaining: number;
	    limit: number;
	    // Go type: time
	    resetAt: any;
	
	    static createFrom(source: any = {}) {
	        return new RateLimitInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.remaining = source["remaining"];
	        this.limit = source["limit"];
	        this.resetAt = this.convertValues(source["resetAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

