/* ---------------------------------------------------------
Define global variables
--------------------------------------------------------- */
var vids = [];
var btn_plays = [];
var sliders = [];
const slider_max = 1000;
var text_time_curs = [];
var text_time_durs = [];
var btn_backward10s = [];
var btn_forward10s = [];
var btn_backward1s = [];
var btn_forward1s = [];

const eventColors = ["#93d75b", "#5ac1fd", "#e39a5e", "#e3d85e", "#c256c2"];
const lineWidth = 1;

// Player stoping point
var video_stop_at = null;

// Player size
const size_video_p = 3;

const size_video_control_p = 5;
const size_video_control_f = 9;

const size_canvas_t = 3;

var size_video_w;
var size_video_cont_w;
var size_main_w;
var size_canvas_l;
var size_canvas_stack_h;
var size_canvas_w;
var size_canvas_h;

function get_basename(s) {
    var lastIndex1 = s.lastIndexOf("\\");
    if (lastIndex1 >= 0) {
        s = s.substring(lastIndex1 + 1);
    }

    return s;
}

/* ---------------------------------------------------------
Set events
--------------------------------------------------------- */
function init()
{
    document.getElementById('upload'+(num_videos-1).toString()).onchange = uploadOnChange;

    function uploadOnChange() {
        var srcdir = document.getElementById('srcdir').value;
        for (let i = 0; i < num_videos; i++)
        {
            var vidpath = srcdir + '/' + get_basename(document.getElementById('upload'+i.toString()).value);
            document.getElementById('source'+i.toString()).src = vidpath;
            vid = document.getElementById("video"+i.toString());
            vid.load();
            vids.push(vid);
            pre_initializePlayer(i);
            vids[i].addEventListener('loadedmetadata', function(e){
                initializePlayer_step2(i)
            });
        }
    }
}
document.addEventListener("DOMContentLoaded", init, false);



/* ---------------------------------------------------------
Set size of elements
--------------------------------------------------------- */
function setAllSizes(videoId) {
    //const window_w = window.screen.width * window.devicePixelRatio;
    //const window_h = window.screen.height * window.devicePixelRatio;
    const window_w  = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const window_h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    const video_w = vids[videoId].videoWidth;
    const video_h = vids[videoId].videoHeight;

    //set the video with so that the height will be 0.5 of the screen height
    //or at maximum, width of video will be 0.9 of screen width
    var target_h = 0.5 * window_h;
    var target_w = (video_w / video_h) * target_h;

    size_video_w = Math.min(0.9*window_w, target_w);

    // alert(`S_w: ${window_w}, S_h: ${window_h}, V_w: ${video_w}, V_h: ${video_h}, T_w: ${target_w}, F_w: ${size_video_w}`);
    
    size_video_cont_w = size_video_w + (2 * size_video_p);
    size_main_w = size_video_cont_w;
    size_canvas_l = size_video_control_p + 5;
    size_canvas_w = Math.floor(size_video_cont_w - (2 * size_canvas_l));
    size_canvas_h = Math.floor(size_canvas_w * 0.05);
    size_canvas_stack_h = size_canvas_h + (2 * size_canvas_t);

    // alert(`w: ${size_canvas_w}, h: ${size_canvas_h}`);

    elements = document.getElementsByClassName('video-container');
    for (let i=0; i<elements.length; i++) {
        elements[i].style.width = size_video_cont_w.toString() + "px";
    }

    elements = document.getElementsByClassName('main-video');
    for (let i=0; i<elements.length; i++) {
        elements[i].style.width = size_video_w.toString() + "px";
        elements[i].style.left = size_video_p.toString() + "px";
        elements[i].style.top = size_video_p.toString() + "px";
    }

    elements = document.getElementsByClassName('video-controls');
    for (let i=0; i<elements.length; i++) {
        elements[i].style.width = size_video_cont_w.toString() + "px";
        elements[i].style.padding = size_video_control_p.toString() + "px";
        elements[i].style.fontSize = size_video_control_f.toString() + "pt";
    }

    elements = document.getElementsByClassName('annotation-container');
    for (let i=0; i<elements.length; i++) {
        elements[i].style.width = size_main_w.toString() + "px";
    }

    elements = document.getElementsByClassName('annotation-label');
    for (let i=0; i<elements.length; i++) {
        elements[i].style.fontSize = size_video_control_f.toString() + "pt";
    }

    elements = document.getElementsByClassName('annotation-controls');
    for (let i=0; i<elements.length; i++) {
        elements[i].style.fontSize = size_video_control_f.toString() + "pt";
    }

    elements = document.getElementsByClassName('annotation-canvas-stack');
    for (let i=0; i<elements.length; i++) {
        elements[i].style.width = size_video_cont_w.toString() + "px";
        elements[i].style.height = size_canvas_stack_h.toString() + "px";
    }

    elements = document.getElementsByClassName('annotation-canvas');
    for (let i=0; i<elements.length; i++) {
        elements[i].style.width = size_canvas_w.toString() + "px";
        elements[i].style.height = size_canvas_h.toString() + "px";
        elements[i].style.left = size_canvas_l.toString() + "px";
        elements[i].style.top = size_canvas_t.toString() + "px";
    }

    elements = document.getElementsByClassName('annotation-canvas-slider');
    for (let i=0; i<elements.length; i++) {
        elements[i].style.width = size_canvas_w.toString() + "px";
        elements[i].style.height = size_canvas_h.toString() + "px";
        elements[i].style.left = size_canvas_l.toString() + "px";
        elements[i].style.top = size_canvas_t.toString() + "px";
    }

    elements = document.getElementsByClassName('annotation-canvas-region');
    for (let i=0; i<elements.length; i++) {
        elements[i].style.height = size_canvas_h.toString() + "px";
        elements[i].style.top = size_canvas_t.toString() + "px";
    }
}


/* ---------------------------------------------------------
Initialize player and variables
--------------------------------------------------------- */
function pre_initializePlayer(videoId) {
    // basic player
	btn_play = document.getElementById("btn-play"+videoId.toString());
    btn_plays.push(btn_play);

	slider = document.getElementById("video-main-slider"+videoId.toString());
    sliders.push(slider);

	text_time_cur = document.getElementById("time-cur"+videoId.toString());
    text_time_curs.push(text_time_cur);

	text_time_dur = document.getElementById("time-dur"+videoId.toString());
    text_time_durs.push(text_time_dur);

    // advanced player
	btn_backward10 = document.getElementById("btn-backward10"+videoId.toString());
	btn_backward1 = document.getElementById("btn-backward1"+videoId.toString());
	btn_forward1 = document.getElementById("btn-forward1"+videoId.toString());
	btn_forward10 = document.getElementById("btn-forward10"+videoId.toString());
    btn_backward10s.push(btn_backward10);
    btn_backward1s.push(btn_backward1);
    btn_forward1s.push(btn_forward1);
    btn_forward10s.push(btn_forward10);


	// Add event listeners
	btn_plays[videoId].addEventListener("click", pre_PlayPause(videoId), false);
	sliders[videoId].addEventListener("input", pre_SliderMoved(videoId), false);
	vids[videoId].addEventListener("timeupdate", pre_VideoTimeUpdated(videoId), false);
    
	btn_backward10s[videoId].addEventListener("click", pre_seekVideo(videoId, -10), false);
	btn_backward1s[videoId].addEventListener("click", pre_seekVideo(videoId, -1), false);
	btn_forward1s[videoId].addEventListener("click", pre_seekVideo(videoId, 1), false);
	btn_forward10s[videoId].addEventListener("click", pre_seekVideo(videoId, 10), false);
}

function initializePlayer_step2(videoId)
{
    // initialize duration text
    
    var durmins = Math.floor(vids[videoId].duration / 60);
    var dursecs = Math.floor(vids[videoId].duration - durmins * 60);
    var durmils = Math.floor((vids[videoId].duration - (durmins * 60 + dursecs)) * 100);

    if(durmins < 10){ durmins = "0"+durmins; }
    if(dursecs < 10){ dursecs = "0"+dursecs; }
    if(durmils < 10){ durmils = "0"+durmils; }
        
    text_time_durs[videoId].innerHTML = durmins+":"+dursecs+":"+durmils;

    // set the size
    setAllSizes(videoId);
}

/* ---------------------------------------------------------
What happens when pressing Play / Pause button
--------------------------------------------------------- */
var pre_PlayPause = function(vidId) {

    return function curried_func(e) {
        playPause(vidId);
    }
}



/* ---------------------------------------------------------
What happens when pressing Play / Pause button
--------------------------------------------------------- */
function playPause(vidId) {
    if(vids[vidId].paused){
        vids[vidId].play();
        btn_plays[vidId].innerHTML = "Pause";
    } else {
        vids[vidId].pause();
        btn_plays[vidId].innerHTML = "Play";
    }
}



var pre_SliderMoved = function(vidId) {
    return function curried_func(e) {
        SliderMoved(vidId);
    }
}



/* ---------------------------------------------------------
What happens when using slider
--------------------------------------------------------- */
function SliderMoved(videoId) {
	var seekto = vids[videoId].duration * (sliders[videoId].value / slider_max);
	vids[videoId].currentTime = seekto;
}




var pre_VideoTimeUpdated = function(vidId) {
    return function curried_func(e) {
        VideoTimeUpdated(vidId);
    }
}



/* ---------------------------------------------------------
What happens when video current time updated
--------------------------------------------------------- */
function VideoTimeUpdated(vidId) {
    if (video_stop_at) {
        if (vids[vidId].currentTime >= (video_stop_at-0.1)){
            vids[vidId].pause();
            btn_plays[vidId].innerHTML = "Play";
        }
    }

	var nt = vids[vidId].currentTime * (slider_max / vids[vidId].duration);
	slider.value = nt;
    drawCanvasSlider();
	
	var curmins = Math.floor(vids[vidId].currentTime / 60);
	var cursecs = Math.floor(vids[vidId].currentTime - curmins * 60);
	var curmils = Math.floor((vids[vidId].currentTime - (curmins * 60 + cursecs)) * 100);
	
	if(curmins < 10){ curmins = "0"+curmins; }
	if(cursecs < 10){ cursecs = "0"+cursecs; }
	if(curmils < 10){ curmils = "0"+curmils; }
	
	text_time_curs[vidId].innerHTML = curmins+":"+cursecs+":"+curmils;
}



var pre_seekVideo = function(vidId, frames) {
    return function curried_func(e) {
        seekVideo(vidId, frames);
    }
}




/* ---------------------------------------------------------
Seeking video a specific amount
--------------------------------------------------------- */
function seekVideo(vidId, frames) {
    var fps = 30;
    var dx = frames / fps;
    var new_time = Math.min(Math.max(0, vids[vidId].currentTime + dx), vids[vidId].duration);

    vids[vidId].currentTime = new_time;
}
