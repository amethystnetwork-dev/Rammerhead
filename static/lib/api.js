export default class Api {
    constructor() {
        this.ok = true;
    }

    async needpassword() {
        const res = await this.get("/needpassword");
        return res === "true";
    }

    async newsession() {
        const res = await this.get("/newsession");
        return res;
    }

    async editsession(id, httpProxy, enableShuffling) {
        const res = await this.get(
            "/editsession?id=" +
            encodeURIComponent(id) +
            (httpProxy ? "&httpProxy=" + encodeURIComponent(httpProxy) : "") +
            "&enableShuffling=" + (enableShuffling ? "1" : "0"),
        );
        if (res !== "Success") throw `unexpected response from server. received ${res}`;
    }

    async sessionexists(id) {
        const res = await this.get("/sessionexists?id=" + encodeURIComponent(id));
        if (res === "exists") return true;
        if (res === "not found") return false;
        throw `unexpected response from server. received ${res}`;
    }

    async deletesession(id) {
        const exists = await this.sessionexists(id);
        if (exists) {
            const res = await this.get("/deletesession?id=" + id);
            if (res !== "Success" && res !== "not found") throw `unexpected response from server. received ${res}`;
        }
    }

    async shuffleDict(id) {
        const res = await this.get("/api/shuffleDict?id=" + encodeURIComponent(id));
        return JSON.parse(res);
    }

    async get(url, shush = false) {
        const pwd = getPassword();
        if (pwd) {
            // really cheap way of adding a query parameter
            if (url.includes("?")) {
                url += "&pwd=" + pwd;
            } else {
                url += "?pwd=" + pwd;
            }
        }
        const request = await fetch(url);
    
        if(request.ok) {
            const text = await request.text();
            if(request.status === 200) return text;
            if (!shush) throw `unexpected server response to not match "200". Server says ""${text}""`
        } else {
            if (!shush) throw "Cannot communicate with the server";
        }
    }
}

function getPassword() {
    var element = document.getElementById("session-password");
    return element ? element.value : "";
}