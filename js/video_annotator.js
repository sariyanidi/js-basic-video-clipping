/* ---------------------------------------------------------
Define global variables
--------------------------------------------------------- */
var lastEventStart = null;
var activeRegion = null;

/* ---------------------------------------------------------
Basic drawing and control functions
--------------------------------------------------------- */

// Draw line in canvas
// ----------------------------
function canvasDrawLine(canvas, ctx, px, lw, ls) {
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, canvas.height);
    ctx.closePath();
    ctx.lineWidth = lw;
    ctx.strokeStyle = ls;
    ctx.stroke();
}

// Moving slider within annotation canvas
// ----------------------------
async function drawCanvasSlider() {
    var canvasSliders = document.getElementsByClassName('annotation-canvas-slider');

    for (let i=0; i<canvasSliders.length; i++) {
        var canvas = canvasSliders[i];
        var ctx = canvas.getContext("2d");

        await ctx.clearRect(0, 0, canvas.width, canvas.height);

        // draw new lines
        var px = (vids[i].currentTime / vids[i].duration) * canvas.width;
        canvasDrawLine(canvas, ctx, px, lineWidth, 'red');
    }
}

// Check if current time is inside a previous event
// ----------------------------
function isInsideEvent(events, px) {
    outcome = -1;

    for (let i=0; i<events.length; i++) {
        var strt = events[i][0];
        var stp = events[i][1];
        if ((px >= strt) && (px <= stp)) {
            outcome = i;
            break;
        }
    }

    return outcome;
}

// Check if current selection would stay inside or cover a previous event 
// ----------------------------
function isSupersetEvent(events, x0, x1, skip=-1) {
    outcome = -1;

    for (let i=0; i<events.length; i++) {
        var strt = events[i][0];
        var stp = events[i][1];
        if (((x0 <= strt) && (x1 >= stp)) || ((strt <= x0) && (stp >= x1))) {
            outcome = i;
            if (outcome != skip) {
                break;
            }
        }
    }

    return outcome;
}




/* ---------------------------------------------------------
Operations on regions
--------------------------------------------------------- */

// Select an active region
// ----------------------------
function selectActiveRegion(regionID) {
    if ((activeRegion == null) && (lastEventStart == null)) {
        activeRegion = regionID;
        region = document.getElementById(regionID);
    
        // stylize active region
        region.style.border = "medium solid #c03f1c";

        // disable generic buttons
        var buttons = document.getElementsByClassName('generic-controls');    
        for (let i=0; i<buttons.length; i++) {
            buttons[i].disabled = true;
        }

        // show region buttons
        controls = document.getElementById('region-controls');
        controls.style.display = "block";
    }
}

// Release an active region selection
// ----------------------------
function releaseActiveRegion(deleted=false) {
    if (activeRegion != null) {
        if (!deleted) { 
            region = document.getElementById(activeRegion);
        
            // de-stylize active region
            region.style.border = "0px";
        }

        //enable generic buttons
        var buttons = document.getElementsByClassName('generic-controls');    
        for (let i=0; i<buttons.length; i++) {
            buttons[i].disabled = false;
        }

        // hide region buttons
        controls = document.getElementById('region-controls');
        controls.style.display = "none";
    
        activeRegion = null;
        video_stop_at = null;
    }
}

// Create a new region element correnponding to an event
// ----------------------------
function createEventRegion(id, str, stp) {
    var stackID = "annotation-canvas-stack" + id.toString();
    var stack = document.getElementById(stackID);

    // assign an ID
    var regions = stack.getElementsByClassName('annotation-canvas-region');
    var num_regions = regions.length;
    if (num_regions) {
        stack.counter += 1;
    }
    else {
        stack.counter = 0; 
    }
    var regionID = 'annotation-canvas-region' + id.toString() + stack.counter.toString();

    // create a region canvas
    var region = document.createElement("canvas");
    region.className = 'annotation-canvas-region';
    region.id = regionID;

    // stylize region
    var idx = id % eventColors.length;
    var color = eventColors[idx];
    var x0 = size_canvas_l + (str / vids[id].duration) * size_canvas_w;
    var x1 = size_canvas_l + (stp / vids[id].duration) * size_canvas_w;
    var w = x1 - x0;

    region.style.height = size_canvas_h.toString() + "px";
    region.style.top = size_canvas_t.toString() + "px";
    region.style.left = x0.toString() + 'px';
    region.style.width = w.toString() + 'px';
    region.style.backgroundColor = color + '99';

    // store information
    var label = document.getElementById('annotation-label' + id.toString()).innerText;
    region.data = {
        channel: id,
        label: label,
        id: stack.counter,
        name: regionID,
        time_str: str,
        time_stp: stp
    }

    // add click event
    region.onclick = function() { selectActiveRegion(region.id); };

    // add region to stack
    stack.appendChild(region);

    // console.log(region.data);
}

function copyToClipboard(text) {
    window.prompt("Copy to clipboard: Ctrl+C, Enter", text);
}




/* ---------------------------------------------------------
Operations on event (star, end, delete)
--------------------------------------------------------- */

// populate all annotations to submit
// ----------------------------
function populateAllAnnotations() {
    var stacks = document.getElementsByClassName('annotation-canvas-stack');
 
    var output = {};
    var python_args  = '';
    for (let i=0; i<stacks.length; i++) {
        var stack  = stacks[i];
        //var name = document.getElementById('annotation-label'+ i.toString()).innerText;
        var vpath = document.getElementById('source'+ i.toString()).src.substring(7);
        var events = [];
        
        python_args += vpath + ' '

        var regions = stack.getElementsByClassName('annotation-canvas-region');
        for (let j=0; j<regions.length; j++) {
            var region  = regions[j];
            var event = [region.data.time_str, region.data.time_stp];
            events.push(event);
            python_args += region.data.time_str + ' ' + region.data.time_stp + ' ';
        }
        output[vpath] = events;
    }



    var elm = document.getElementById("output-speed").selectedIndex;
    console.log(elm);

    var target_dir  = document.getElementById('output-dir').value;
    var target_bname = document.getElementById('output-basename').value;
    var spd = document.getElementById('output-speed').value;

    ffmpeg_cmd = 'python create_multi_video.py ' + python_args + ' ' + spd + ' ' + target_dir + '/'+ target_bname + '_' + spd+ '.mp4';

    var result_output = JSON.stringify(output);
    document.getElementById('annotation-result').value = ffmpeg_cmd;
    var elem = document.getElementById('ffmpeg-command');
    elem.innerHTML = ffmpeg_cmd;

    if (document.getElementById('annotation-result').value) {
        copyToClipboard(ffmpeg_cmd);
        return false;
    }
    else {
        alert('Please submit again');
        return false;
    }
}

// Apply previously annotated regions
// ----------------------------
function applyPreviousAnnotations(annotations) {
    //annotations = '{"Head Nodding":[[2.276736,7.569408],[10.230528,13.956096],[18.450432,23.181312]],"Head Shaking":[[5.144832,9.077376],[13.394304,15.789312],[20.815872,28.444416]]}';
    annotations = JSON.parse(annotations);
    
    var id = 0;
    for (var key in annotations) {
        if (annotations.hasOwnProperty(key)) {
            var regions = annotations[key];
            for (let i=0; i<regions.length; i++) {
                var region = regions[i];
                if (Array.isArray(region)) {
                    if (region.length == 2) {
                        createEventRegion(id, region[0], region[1]);
                    }
                }
            }
        }
        id++;
    }
}

// Populate times for all previous events
// ----------------------------
function populateEventTimes(id) {
    var stackID = "annotation-canvas-stack" + id.toString();
    var stack = document.getElementById(stackID);

    var eventTimes = [];

    // read all region data
    var regions = stack.getElementsByClassName('annotation-canvas-region');    
    for (let i=0; i<regions.length; i++) {
        var region  = regions[i];
        var event = [region.data.time_str, region.data.time_stp];
        eventTimes.push(event);
    }

    return eventTimes;
}

// Get index of an event within all events of the canvas
// ----------------------------
function getEventIndex(id, activeRegion) {
    var stackID = "annotation-canvas-stack" + id.toString();
    var stack = document.getElementById(stackID);

    var regions = stack.getElementsByClassName('annotation-canvas-region');
    var idx = -1;  
    for (let i=0; i<regions.length; i++) {
        if (regions[i].data.name == activeRegion) {
            idx = i;
            break;
        }
    }

    return idx;
}

// Mark starting point of an event
// ----------------------------
function eventMarkStart(id) {
    var canvasID = "annotation-canvas" + id.toString();
    var canvas = document.getElementById(canvasID);
    var ctx = canvas.getContext("2d");
    var idx = id % eventColors.length;
    var color = eventColors[idx];
    
    // draw start mark if there is no previous unended event
    var ct = vids[id].currentTime;
    var x0 = (ct / vids[id].duration) * canvas.width;

    var events = populateEventTimes(id);

    if (lastEventStart == null){
        if (isInsideEvent(events, ct) == -1) {
            lastEventStart = ct;
            canvasDrawLine(canvas, ctx, x0, 1.5*lineWidth, color);
        }
    }
    //console.log(events);
}

// Mark ending point of an event and fill
// ----------------------------
function eventMarkEnd(id) {
    var canvasID = "annotation-canvas" + id.toString();
    var canvas = document.getElementById(canvasID);
    var ctx = canvas.getContext("2d");
    
    var ct = vids[id].currentTime;

    var events = populateEventTimes(id);
    // if there is a previous unended event
    if (lastEventStart != null) {
        if ((isInsideEvent(events, ct) == -1) && (ct > lastEventStart) && (isSupersetEvent(events, lastEventStart, ct) == -1)) {
            // delete start line
            var x0 = (lastEventStart / vids[id].duration) * canvas.width;
            ctx.clearRect(x0-2, 0, 4, canvas.height);
            // create the region
            createEventRegion(id, lastEventStart, ct);
            lastEventStart = null;
        }
    }
    //console.log(events);
}

// Delete an event
// ----------------------------
function eventDelete(id) {
    var canvasID = "annotation-canvas" + id.toString();
    var canvas = document.getElementById(canvasID);
    var ctx = canvas.getContext("2d");

    // if delete is pressed after selecting a starting point
    // simply delete start line
    if (lastEventStart != null){
        var x0 = (lastEventStart / vids[id].duration) * canvas.width;
        ctx.clearRect(x0-2, 0, 4, canvas.height);
        lastEventStart = null;
    }
    else {
        var events = populateEventTimes(id);

        // identify event
        var ct = vids[id].currentTime;
        var idx = isInsideEvent(events, ct);
        if (idx > -1) {
            // delete region
            var stackID = "annotation-canvas-stack" + id.toString();
            var stack = document.getElementById(stackID);
            var regions = stack.getElementsByClassName('annotation-canvas-region');
            regions[idx].remove();
        }
    }    
    //console.log(events);
}




/* ---------------------------------------------------------
Region control buttons
--------------------------------------------------------- */

// Play selected region
function playActiveRegion() {
    if (activeRegion != null) {
        console.log(activeRegion);
        region = document.getElementById(activeRegion);
    
        // get start and end times
        str = region.data.time_str;
        stp = region.data.time_stp;

        // play
        if(!vid.paused){
            vid.pause();
        }
        btn_play.innerHTML = "Pause";
        vid.currentTime = str;
        video_stop_at = stp;
        vid.play();
    }
}

// Update starting point of the selected region
function updateRegionStart() {
    if (activeRegion != null) {
        region = document.getElementById(activeRegion);
    
        // get start and end time
        str = vid.currentTime;
        stp = region.data.time_stp;

        // get canvas ID of the event
        var id = region.data.channel;

        // identify event
        var events = populateEventTimes(id);
        var idx = getEventIndex(id, activeRegion);
        
        // check if update causes overlaps between events
        var insideIdx = isInsideEvent(events, str);
        var superIdx = isSupersetEvent(events, str, stp, idx);

        // update region
        if (((insideIdx == -1) || (insideIdx == idx)) && (str < stp) && ((superIdx == -1) || (superIdx == idx))) {
            var x0 = size_canvas_l + (str / vid.duration) * size_canvas_w;
            var x1 = size_canvas_l + (stp / vid.duration) * size_canvas_w;
            var w = x1 - x0;
            region.style.left = x0.toString() + 'px';
            region.style.width = w.toString() + 'px';
            region.data.time_str = str;
        }
    }
}

// Update stopping point of the selected region
function updateRegionStop() {
    if (activeRegion != null) {
        region = document.getElementById(activeRegion);
    
        // get start and end time
        str = region.data.time_str;
        stp = vid.currentTime;

        // get canvas ID of the event
        var id = region.data.channel;

        // identify event
        var events = populateEventTimes(id);
        var idx = getEventIndex(id, activeRegion);
        
        // check if update causes overlaps between events
        var insideIdx = isInsideEvent(events, stp);
        var superIdx = isSupersetEvent(events, str, stp, idx);
        
        // update region
        if (((insideIdx == -1) || (insideIdx == idx)) && (str < stp) && ((superIdx == -1) || (superIdx == idx))) {    
            var x0 = size_canvas_l + (str / vid.duration) * size_canvas_w;
            var x1 = size_canvas_l + (stp / vid.duration) * size_canvas_w;
            var w = x1 - x0;
            region.style.left = x0.toString() + 'px';
            region.style.width = w.toString() + 'px';
            region.data.time_stp = stp;
        }
    }
}

// delete selected region
function deleteRegion() {
    if (activeRegion != null) {
        region = document.getElementById(activeRegion);
        region.remove();
    }
    releaseActiveRegion(true);
}

