

function uix_arrange() {
    trace("uix_arrange() -> FIRED!");
    
    // Top Menu Paint
    $("#div_top_menu_paint").css( "width", app.size.w + "px" );    
        
        // account
        //$("#div_top_menu_account").css( "top", app.size.h - 37 + "px" );
        $("#div_top_menu_account").css( "left", app.size.w - 45 + "px" );   

    // Footer..
    $("#div_footer_bar").css( "top", app.size.h - 59 + "px" );
    $("#div_footer_bar").css( "width", app.size.w + "px" );
    
        // task count
        $("#div_footer_task_count").css( "top", app.size.h - 40 + "px" );
        $("#div_footer_task_count").css( "left", ((app.size.w/12)*1 + "px" ));
        
        // Add task
        $("#div_footer_add_task").css( "top", app.size.h - 84 + "px" );
        $("#div_footer_add_task").css( "left", ((app.size.w - 54)/2 + "px" ));
    
        // Toggle task vis
        $("#div_footer_toggle_task_vis").css( "top", app.size.h - 40 + "px" );
        $("#div_footer_toggle_task_vis").css( "left", (app.size.w /12) * 9 + "px" );
}