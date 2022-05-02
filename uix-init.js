
var app = {
    size:{ w: -1, h: -1 },
    user: {
        account: {
            isLoggedIn: false,
            name: "",
            showUserAsLoggedIn: function() {
                $("#div_top_menu_account").css("background-image", "url('images/logged_in.png')");
            },
            showUserAsLoggedOut: function() {
                $("#div_top_menu_account").css("background-image", "url('images/logged_out.png')");
            },
            onAccountclicked : function() {
                if(app.user.account.isLoggedIn) {
                    logout();
                }
                else {
                    login();
                }
            }
            
        },
        tasks: {
            _taskCompleteCount: -1,
            _taskTotal: -1,
            _hideCompletedTasks: false,
            addNewTask: function(task) {
                app.user.tasks._taskTotal++;
                appendTaskItem(task, app.user.tasks._taskTotal);
                app.user.tasks.setTaskCompleteCount(app.user.tasks._taskCompleteCount, app.user.tasks._taskTotal);
            },
            setTaskCompleteCount: function(completed, total) {
                $("#spTaskCount").html(completed + " / " + total);
                app.user.tasks._taskCompleteCount = completed;
                app.user.tasks._taskTotal = total;
            },
            /** @description  Called when the user clicks the delete icon */
            onDeleteTaskClicked: function(taskUrl, index) {
                console.log("onDeleteTaskClicked()->FIRED!, " + "taskUrl="+taskUrl+", index="+index);
                deleteTask(taskUrl, index);
                // remove the task from the ui list
                if( $("#div_tasks_container").children().length > 0 ) {
                    $("#div_tasks_container").children()[index-1].remove();
                }
                else {
                    $("#div_tasks_container").remove();
                }
                // we need to update the task count etc
                app.user.tasks._taskTotal--;
                app.user.tasks.setTaskCompleteCount(app.user.tasks._taskCompleteCount, app.user.tasks._taskTotal);
            },
            toggleCompletedTasks: function() {
                app.user.tasks._hideCompletedTasks = !app.user.tasks._hideCompletedTasks;
                console.log("toggleCompletedTasks()->FIRED!, app.user.tasks._hideCompletedTask="+app.user.tasks._hideCompletedTasks);
                // we need to run through the task dom and hide/show as required
                for (var i = 0; i < $("#div_tasks_container").children().length; i++) {
                    var el = $("#div_tasks_container").children().eq(i);
                    var vis = el.children().eq(3);
                    if ( vis.css("background-image").indexOf("complete") != -1 ) {
                        // hide this one
                        trace($("#div_tasks_container").children().eq(i).css("display"));
                        if(app.user.tasks._hideCompletedTasks) {
                            // hide
                            $("#div_tasks_container").children().eq(i).css("display", "none");
                            // show the closed eye icon
                            $("#imgToggleCompleted").attr("src", "images/hide_completed_tasks.png");
                        }
                        else {
                            // show
                            $("#div_tasks_container").children().eq(i).css("display", "block");
                            // show the open eye icon
                            $("#imgToggleCompleted").attr("src", "images/view_completed_tasks.png");
                        }                        
                    }
                }
            }


        }
    }
    
};

function trace(msg) { console.log(msg); }

var uix_state = {
    viewport : {width: -1, height: -1 }
};

$(window).resize(function() {
    app.size.w = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
    app.size.h = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)    
    trace("Viewport size: " + app.size.w + " x " + app.size.h );      
    uix_arrange();
});

$(document).ready(function() {
    console.log("DOM ready!");
    uix_init();
    uix_arrange();
});


function uix_init() {
    trace("uix_init() -> FIRED!");
    app.size.w = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
    app.size.h = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)    
    trace("Viewport size: " + app.size.w + " x " + app.size.h );    
}

// this was hacked on..
var box, position, step;

function _slideLeft() {
    position = position - step; 
    if (position <= finish) {
        clearInterval(handler);
        box.style.width = finish + "px";
        return;
    }
    box.style.width = position + "px";
}

function slideLeft(evt_target) {
        box = evt_target,
        step = 2,
        start = 250, finish = 150,
        position = start,
        handler = setInterval(_slideLeft, 1);
}

function _slideRight() {
    position = position + step; 
    if (position >= finish) {
        clearInterval(handler);
        box.style.width = finish + "px";
        return;
    }
    box.style.width = position + "px";
}

function slideRight(evt_target) {
        box = evt_target,
        step = 2,
        start = 150, finish = 250,
        position = start,
        handler = setInterval(_slideRight, 1);
}

document.addEventListener('touchstart', handleTouchStart, false);        
document.addEventListener('touchmove', handleTouchMove, false);

var xDown = null;                                                        
var yDown = null;

function getTouches(evt) {
  return evt.touches ||             // browser API
         evt.originalEvent.touches; // jQuery
}                                                     
                                                                     
function handleTouchStart(evt) {
    const firstTouch = getTouches(evt)[0];                                      
    xDown = firstTouch.clientX;                                      
    yDown = firstTouch.clientY;                                      
};                                                
                                                                         
function handleTouchMove(evt) {
    if ( ! xDown || ! yDown ) {
        return;
    }

    var xUp = evt.touches[0].clientX;                                    
    var yUp = evt.touches[0].clientY;

    var xDiff = xDown - xUp;
    var yDiff = yDown - yUp;
                                                                         
    if ( Math.abs( xDiff ) > Math.abs( yDiff ) ) {/*most significant*/
        if ( xDiff > 0 ) {
            /* right swipe */ 
            trace("right swipe!");
            slideLeft(evt.target);
            
        } else {
            /* left swipe */
            trace("left swipe!");
            slideRight(evt.target);
        }                       
    } else {
        if ( yDiff > 0 ) {
            /* down swipe */ 
            //trace("down swipe!");
        } else { 
            /* up swipe */
            //trace("up swipe!");
        }                                                                 
    }
    /* reset values */
    xDown = null;
    yDown = null;                                             
};
