// This bit of code isn't mine! 

window.onload = () => {
  'use strict';
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
             .register('./manifest_serviceworker.js');
  }
};


let user, tasksContainerUrl;
const solidFileClient = new SolidFileClient(solidClientAuthentication);
solidFileClient.rdf.setPrefix('schemaorg', 'https://schema.org/');

async function restoreSession() {
    // This function uses Inrupt's authentication library to restore a previous session. If you were
    // already logged into the application last time that you used it, this will trigger a redirect that
    // takes you back to the application. This usually happens without user interaction, but if you hadn't
    // logged in for a while, your identity provider may ask for your credentials again.
    //
    // After a successful login, this will also read the profile from your POD.
    //
    // @see https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/authenticate-browser/
    try {
        await solidClientAuthentication.handleIncomingRedirect({ restorePreviousSession: true });
        const session = solidClientAuthentication.getDefaultSession();
        if (!session.info.isLoggedIn) { return false; }
        user = await fetchUserProfile(session.info.webId);
        return user;
    } 
    catch (error) {
        alert(error.message);
        return false;
    }
}

function getLoginUrl() {
    // Asking for a login url in Solid is kind of tricky. In a real application, you should be
    // asking for a user's webId, and reading the user's profile you would be able to obtain
    // the url of their identity provider. However, most users may not know what their webId is,
    // and they introduce the url of their issue provider directly. In order to simplify this
    // example, we just use the base domain of the url they introduced, and this should work
    // most of the time.
    const url = prompt('Introduce your Solid login url');

    if (!url) { return null; }

    const loginUrl = new URL(url);
    loginUrl.hash = '';
    loginUrl.pathname = '';
    return loginUrl.href;
}

function performLogin(loginUrl) {
    solidClientAuthentication.login({
        oidcIssuer: loginUrl,
        redirectUrl: window.location.href,
        clientName: 'Hello World',
    });
}

async function performLogout() {
    await solidClientAuthentication.logout();
    app.user.account.isLoggedIn = false;
    app.user.account.showUserAsLoggedOut();
}


async function performTaskCreation(description) {
    // Data discovery mechanisms are still being defined in Solid, but so far it is clear that
    // applications should not hard-code the url of their containers like we are doing in this
    // example.
    //
    // In a real application, you should use one of these two alternatives:
    //
    // - The Type index. This is the one that most applications are using in practice today:
    //   https://github.com/solid/solid/blob/main/proposals/data-discovery.md#type-index-registry
    //
    // - SAI, or Solid App Interoperability. This one is still being defined:
    //   https://solid.github.io/data-interoperability-panel/specification/

    if (!tasksContainerUrl)
        tasksContainerUrl = await createSolidContainer(`${user.storageUrl}tasks/`);

    const documentUrl = await createSolidDocument(tasksContainerUrl, `
        @prefix schema: <https://schema.org/> .

        <#it>
            a schema:Action ;
            schema:actionStatus schema:PotentialActionStatus ;
            schema:description "${escapeText(description)}" .
    `);
    const taskUrl = `${documentUrl}#it`;
    return { url: taskUrl, description };
}


async function performTaskUpdate(taskUrl, done) {
    const documentUrl = getSolidDocumentUrl(taskUrl);
    await updateSolidDocument(documentUrl, `
        DELETE DATA {
            <#it>
                <https://schema.org/actionStatus>
                <https://schema.org/${done ? 'PotentialActionStatus' : 'CompletedActionStatus'}> .
        } ;
        INSERT DATA {
            <#it>
                <https://schema.org/actionStatus>
                <https://schema.org/${done ? 'CompletedActionStatus' : 'PotentialActionStatus'}> .
        }
    `);
}

async function performTaskDeletion(taskUrl) {
    const documentUrl = getSolidDocumentUrl(taskUrl);
    await deleteSolidDocument(documentUrl);
}


async function loadTasks() {
    // In a real application, you shouldn't hard-code the path to the container like we're doing here.
    // Read more about this in the comments on the performTaskCreation function.

    var containerUrl = `${user.storageUrl}tasks/`;
    var containmentQuads = await readSolidDocument(containerUrl, null, { ldp: 'contains' });

    if (!containmentQuads)
        return [];

    tasksContainerUrl = containerUrl;

    var tasks = [];
    for (const containmentQuad of containmentQuads) {
        const [typeQuad] = await readSolidDocument(containmentQuad.object.value, null, { rdf: 'type' }, { schemaorg: 'Action' });

        if (!typeQuad) {
            // Not a Task, we can ignore this document.
            continue;
        }

        const taskUrl = typeQuad.subject.value;
        const [descriptionQuad] = await readSolidDocument(containmentQuad.object.value, `<${taskUrl}>`, { schemaorg: 'description' });
        const [statusQuad] = await readSolidDocument(containmentQuad.object.value, `<${taskUrl}>`, { schemaorg: 'actionStatus' });

        tasks.push({
            url: taskUrl,
            description: descriptionQuad?.object.value || '-',
            done: statusQuad?.object.value === 'https://schema.org/CompletedActionStatus',
        });
    }
    return tasks;
}


async function readSolidDocument(url, source, predicate, object, graph) {
    try {
        // solidFileClient.rdf.query returns an array of statements with matching terms.
        // (load and cache url content)
        return await solidFileClient.rdf.query(url, source, predicate, object, graph);
    } catch (error) {
        return null;
    }
}


async function createSolidDocument(url, contents) {
    const response = await solidFileClient.post(url, {
        headers: { 'Content-Type': 'text/turtle' },
        body: contents,
    });
    if (!isSuccessfulStatusCode(response.status)) {
        throw new Error(`Failed creating document at ${url}, returned status ${response.status}`);
    }
    const location = response.headers.get('Location');
    return new URL(location, url).href;
}


async function updateSolidDocument(url, update) {
    const response = await solidFileClient.patchFile(url, update, 'application/sparql-update');
    if (!isSuccessfulStatusCode(response.status)) {
        throw new Error(`Failed updating document at ${url}, returned status ${response.status}`);
    }
}


async function deleteSolidDocument(url) {
    const response = await solidFileClient.deleteFile(url);
    if (!isSuccessfulStatusCode(response.status)) {
        throw new Error(`Failed deleting document at ${url}, returned status ${response.status}`);
    }
}


async function createSolidContainer(url) {
    const response = await solidFileClient.createFolder(url);
    if (!isSuccessfulStatusCode(response.status)) {
        throw new Error(`Failed creating container at ${url}, returned status ${response.status}`);
    }
    return url;
}


function isSuccessfulStatusCode(statusCode) {
    return Math.floor(statusCode / 100) === 2;
}


function getSolidDocumentUrl(resourceUrl) {
    const url = new URL(resourceUrl);
    url.hash = '';
    return url.href;
}


async function fetchUserProfile(webId) {
    const [nameQuad] = await readSolidDocument(webId, null, { foaf: 'name' });
    const [storageQuad] = await readSolidDocument(webId, null, { space: 'storage' });

    return {
        url: webId,
        name: nameQuad?.object.value || 'Anonymous',

        // WebIds may declare more than one storage url, so in a real application you should
        // ask which one to use if that happens. In this app, in order to keep it simple, we'll
        // just use the first one. If none is declared in the profile, we'll search for it.
        storageUrl: storageQuad?.object.value || await findUserStorage(webId),
    };
}


// See https://solidproject.org/TR/protocol#storage.
async function findUserStorage(url) {
    url = url.replace(/#.*$/, '');
    url = url.endsWith('/') ? url + '../' : url + '/../';
    url = new URL(url);
    const response = await solidFileClient.head(url.href);
    if (response.headers.get('Link')?.includes('<http://www.w3.org/ns/pim/space#Storage>; rel="type"')) {
        return url.href;
    }
    // Fallback for providers that don't advertise storage properly.
    if (url.pathname === '/') {
        return url.href;
    }
    return findUserStorage(url.href);
}


function escapeText(text) {
    return text.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}









async function main() {
    app.ui.preloader_Show();
    var user = await restoreSession();
    app.user.account.isLoggedIn = false;
    app.user.account.showUserAsLoggedOut();
    
    if (!user) {
        // show the get yourself a solid account!
        $("#auth-guest").css("display", "block");
        app.ui.preloader_Hide();
        return;
    }
    document.getElementById('auth-user').removeAttribute('hidden');
    app.user.account.isLoggedIn = true;
    app.user.account.showUserAsLoggedIn();
    $("#auth-guest").css("display", "none");
    app.ui.preloader_Show();
    await loadSolidTasks();
    app.ui.preloader_Hide();
}


async function loadSolidTasks() {
    console.log("loadSolidTasks()->FIRED!");  
    var tasks = 0;
    var completed = 0;
    var total = 0;
    // try and get some tasks but don't assume we actually have any!
    $("#div_tasks_container").html("");
    try {
        tasks = await loadTasks();
        app.user.tasks._SolidTasksData = tasks;
        completed = 0;
        total = 0;
        for (var task of tasks) {
            if ( task.done ) {
                completed++;
            }
            total++;
            appendTaskItem(task , total);
        }
        app.user.tasks.setTaskCompleteCount(completed, total);   
    }
    catch (err) {
        console.log("err=" + err);
    }
    
    if(tasks == null){
        $("#auth-user-your-tasks-msg").html("You have no tasks yet!");
    }
    else {
        $("#auth-user-your-tasks-msg").html("Your tasks..");
        trace("loadSolidTasks total="+total);
    }    
    return;
}


function login() {
    const loginUrl = getLoginUrl();
    if (!loginUrl) { 
        return; 
    }
    performLogin(loginUrl);
}


async function logout() {
    console.log("logout()->FIRED!");
    $("#auth-guest").css("display", "block");
    $("#auth-user").css("display", "none");
    try { 
        await performLogout(); 
    }
    catch (err) { 
        console.log("logout ERR=" + err); 
    }
    finally {
        app.user.account.showUserAsLoggedOut();
        $("#auth-guest").css("visibility", "visible");
    }
}


async function createTask() {
    console.log("createTask()->FIRED!");
    var description = prompt('Task description');
    if (!description) { return; }
    app.ui.preloader_Show();
    var task = await performTaskCreation(description);
    app.user.tasks.addNewTask(task);
    app.ui.preloader_Hide();
}


async function updateTask(taskUrl, state, index) {
    console.log("updateTask()->FIRED!, taskUrl=" + taskUrl + ", state="+state+", index="+index);
    // mark as complete in the ss solid task doc
    app.ui.preloader_Show();
    await performTaskUpdate(taskUrl, state);
    app.ui.preloader_Hide();
    // we need to update the icon to ticked or not ticked
    if(state) {
        // complete!
        $("#div_tasks_container").children().eq((index-1)).children().eq(3).css("background-image", "url('images/task_complete.png')");
        $("#div_tasks_container").children().eq((index-1)).children().eq(3).attr("onclick", "updateTask('"+taskUrl+"', false, "+index+");");
        app.user.tasks._taskCompleteCount++;
        app.user.tasks.setTaskCompleteCount(app.user.tasks._taskCompleteCount, app.user.tasks._taskTotal);        
    }
    else {
        // un-complete!
        $("#div_tasks_container").children().eq((index-1)).children().eq(3).css("background-image", "url('images/task.png')");
        $("#div_tasks_container").children().eq((index-1)).children().eq(3).attr("onclick", "updateTask('"+taskUrl+"', true, "+index+");");
        app.user.tasks._taskCompleteCount--;
        app.user.tasks.setTaskCompleteCount(app.user.tasks._taskCompleteCount, app.user.tasks._taskTotal);        
    }
}


async function deleteTask(taskUrl, index) {
    app.ui.preloader_Show();
    await performTaskDeletion(taskUrl);    
    app.ui.preloader_Hide();
}


function appendTaskItem(task, index) {
    var taskItem = "";
    taskItem = `
            <!-- shadow base -->
            <div id="`+(task.url).hashCode()+`" style="position:relative; width:300px; height:45px;">
                <div id="div_swipe_widget_base`+index+`" style="pointer-events: none; position:absolute; left:186px; top:-3px; width:102px; height:40px; visibility:hidden-">
                    <img src="images/delete_reveal2.png"/>
                </div>
                
                <!-- edit | delete -->
                <div id="div_swipe_widget_reveal`+index+`" style="pointer-events: none-; position:absolute; left:260px; top:4px;  width:30px; height:40px; visibility:hidden-">
                    <img onclick="javascript:app.user.tasks.onDeleteTaskClicked('${task.url}',`+index+`)" src="images/delete.png"/>
                </div>

                <!-- swipe bar -->
                <div id="div_swipe_widget`+index+`" style="position:absolute; left:38px; top:-3px; width:250px; height:40px; background-color: #ffffff; opacity:1-"></div> 
    
                <div onclick="javascript:${((task.done) ? "updateTask('"+task.url+"', false, "+index+")" : "updateTask('"+task.url+"', true, "+index+")")}" style="position:absolute; left:0px; top:0px;  width:35px; height:35px; cursor: pointer; background-image: url('images/${((task.done)? "task_complete.png" : "task.png")}')"></div>
    
                <div style="pointer-events: none; position:absolute; left:39px; top:0px;  width:300px; height:35px; background-color:#800000-">
                    <span style="font-size:15px">
                        ${task.description}
                    </span>
                </div>   
            <div>`;
   $("#div_tasks_container").append(taskItem);
   // we need to reposition these!
   $("#div_swipe_widget_base"+(index)).css( "left", (app.size.w - 134) + "px" );
   $("#div_swipe_widget_reveal"+(index)).css( "left", (app.size.w - 60) + "px" );
   $("#div_swipe_widget"+(index)).css( "left", (app.size.w - 282) + "px" );
}

// ------------------------------------------------------------------

main();

//window.onunhandledrejection = (error) => alert(`Error;: ${error.reason?.message}`);
