import StrShuffler from "./lib/StrShuffler.js";
import Api from "./lib/api.js";

function setError(err) {
    var element = document.getElementById("error-text");
    if (err) {
        element.style.display = "block";
        element.textContent = "An error occurred: " + err;
    } else {
        element.style.display = "none";
        element.textContent = "";
    }
}

window.addEventListener("error", setError);

(function () {
    const api = new Api();
    var localStorageKey = "rammerhead_sessionids";
    var localStorageKeyDefault = "rammerhead_default_sessionid";
    var sessionIdsStore = {
        get() {
            var rawData = localStorage.getItem(localStorageKey);
            if (!rawData) return [];
            try {
                var data = JSON.parse(rawData);
                if (!Array.isArray(data)) throw "getout";
                return data;
            } catch (e) {
                return [];
            }
        },
        set(data) {
            if (!data || !Array.isArray(data)) throw new TypeError("must be array");
            localStorage.setItem(localStorageKey, JSON.stringify(data));
        },
        getDefault() {
            var sessionId = localStorage.getItem(localStorageKeyDefault);
            if (sessionId) {
                var data = sessionIdsStore.get();
                data.filter(function (e) {
                    return e.id === sessionId;
                });
                if (data.length) return data[0];
            }
            return null;
        },
        setDefault(id) {
            localStorage.setItem(localStorageKeyDefault, id);
        }
    };

    function renderSessionTable(data) {
        var tbody = document.querySelector("tbody");
        while (tbody.firstChild && !tbody.firstChild.remove());
        for (var i = 0; i < data.length; i++) {
            var tr = document.createElement("tr");
            appendIntoTr(data[i].id);
            appendIntoTr(data[i].createdOn);

            var fillInBtn = document.createElement("button");
            fillInBtn.textContent = "Fill in existing session ID";
            fillInBtn.className = "btn btn-outline-primary";
            fillInBtn.onclick = index(i, function (idx) {
                setError();
                sessionIdsStore.setDefault(data[idx].id);
                loadSettings(data[idx]);
            });
            appendIntoTr(fillInBtn);

            var deleteBtn = document.createElement("button");
            deleteBtn.textContent = "Delete";
            deleteBtn.className = "btn btn-outline-danger";
            deleteBtn.onclick = index(i, function (idx) {
                setError();
                api.deletesession(data[idx].id).then(() => {
                    data.splice(idx, 1)[0];
                    sessionIdsStore.set(data);
                    renderSessionTable(data);
                });
            });
            appendIntoTr(deleteBtn);

            tbody.appendChild(tr);
        }
        function appendIntoTr(stuff) {
            var td = document.createElement("td");
            if (typeof stuff === "object") {
                td.appendChild(stuff);
            } else {
                td.textContent = stuff;
            }
            tr.appendChild(td);
        }
        function index(i, func) {
            return func.bind(null, i);
        }
    }
    function loadSettings(session) {
        document.getElementById("session-id").value = session.id;
        document.getElementById("session-httpproxy").value = session.httpproxy || "";
        document.getElementById("session-shuffling").checked = typeof session.enableShuffling === "boolean" ? session.enableShuffling : true;
    }
    function loadSessions() {
        var sessions = sessionIdsStore.get();
        var defaultSession = sessionIdsStore.getDefault();
        if (defaultSession) loadSettings(defaultSession);
        renderSessionTable(sessions);
    }
    function addSession(id) {
        var data = sessionIdsStore.get();
        data.unshift({ id: id, createdOn: new Date().toLocaleString() });
        sessionIdsStore.set(data);
        renderSessionTable(data);
    }
    function editSession(id, httpproxy, enableShuffling) {
        var data = sessionIdsStore.get();
        for (var i = 0; i < data.length; i++) {
            if (data[i].id === id) {
                data[i].httpproxy = httpproxy;
                data[i].enableShuffling = enableShuffling;
                sessionIdsStore.set(data);
                return;
            }
        }
        throw new TypeError("cannot find " + id);
    }

    api.get("/mainport").then((data) => {
        var defaultPort = window.location.protocol === "https:" ? 443 : 80;
        var currentPort = window.location.port || defaultPort;
        var mainPort = data || defaultPort;
        if (currentPort != mainPort) window.location.port = mainPort;
    });

    api.needpassword().then(doNeed => {
        if (doNeed) {
            document.getElementById("password-wrapper").style.display = "";
        }
    });
    window.addEventListener("load", function () {
        loadSessions();

        var showingAdvancedOptions = false;
        document.getElementById("session-advanced-toggle").onclick = function () {
            // eslint-disable-next-line no-cond-assign
            document.getElementById("session-advanced-container").style.display = (showingAdvancedOptions =
                !showingAdvancedOptions)
                ? "block"
                : "none";
        };

        document.getElementById("session-create-btn").addEventListener("click", () => {
            setError();
            api.newsession().then((id) => {
                addSession(id);
                document.getElementById("session-id").value = id;
                document.getElementById("session-httpproxy").value = "";
            });
        });
        async function go() {
            setError();
            const id = document.getElementById("session-id").value;
            const httpproxy = document.getElementById("session-httpproxy").value;
            const enableShuffling = document.getElementById("session-shuffling").checked;
            const url = document.getElementById("session-url").value || "https://www.google.com/";
            if (!id) return setError("must generate a session id first");
            const value = api.sessionexists(id);
            if (!value) return setError("session does not exist. try deleting or generating a new session");
            await api.editsession(id, httpproxy, enableShuffling);
            editSession(id, httpproxy, enableShuffling);
            const shuffleDict = await api.shuffleDict(id);
            if (!shuffleDict) {
                window.location.href = "/" + id + "/" + url;
            } else {
                var shuffler = new StrShuffler(shuffleDict);
                window.location.href = "/" + id + "/" + shuffler.shuffle(url);
            }
        }
        document.getElementById("session-go").onclick = go;
        document.getElementById("session-url").addEventListener("keydown", (event) => {
            if (event.key === "Enter") go();
        });
    });
})();