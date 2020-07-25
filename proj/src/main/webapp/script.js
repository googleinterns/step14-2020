const firebase = require('firebase');
const $ = require('jquery');
require('bootstrap'); // for collapse

/*
    Notifications
 */

// const messaging = firebase.messaging();
// messaging.requestPermission()
// .then(function () {
//     console.log("Have permission");
//     if ('serviceWorker' in navigator) {
//         navigator.serviceWorker.register('/firebase-messaging-sw.js')
//         .then(function(registration) {
//             console.log('Registration successful, scope is:', registration.scope);
//         }).catch(function(err) {
//             console.log('Service worker registration failed, error:', err);
//         });
//     }
// });

// messaging.onMessage((payload) => {
//     appendMessage(payload);
// });

function appendMessage(payload){
    const messagesElement = document.getElementById("messages");
    const dataHeaderElement = document.createElement("h4");
    const dataElement = document.createElement("pre");
    dataHeaderElement.textContent = payload.notification.title;
    dataElement.textContent = payload.notification.body;

    messagesElement.appendChild(dataHeaderElement);
    messagesElement.appendChild(dataElement);
}

/*
    Chatroom sidebar
*/ 

// Hides submenus. Profile and chat lists are in different submenus and appear when its sidebar option is clicked.
$('#body-row .collapse').collapse('hide'); 

// Collapse/Expand icon
$('#collapse-icon').addClass('fa-angle-double-left'); 

// Collapse on click
$('[data-toggle = sidebar-colapse]').click(function() {
    sidebarCollapse();
});

function sidebarCollapse () {
    // remove locational reset 
    $('#bottom').removeClass('topbtn'); 

    // if the device is small, this will hide the chat when they open the side bar
    if (screen.width < 750) {
        $('.sidebar + .p-4').toggleClass('d-none'); 
    }

    // collapse sidebar as normal 
    $('.menu-collapsed').toggleClass('d-none');
    $('.sidebar-submenu').toggleClass('d-none');
    $('.submenu-icon').toggleClass('d-none');
    $('#sidebar-container').toggleClass('sidebar-expanded sidebar-collapsed');

    // Treating d-flex/d-none on separators with title
    var SeparatorTitle = $('.sidebar-separator-title');
    if ( SeparatorTitle.hasClass('d-flex') ) {
        SeparatorTitle.removeClass('d-flex');
    } else {
        SeparatorTitle.addClass('d-flex');
    }

    // move the buttom on mobile view
    if ((screen.width < 500) && ($( "#sidebar-container" ).hasClass( "sidebar-collapsed" ))) {
        $('#bottom').addClass('topbtn'); 
    }

     // Collapse/Expand icon
     $('#collapse-icon').toggleClass('fa-angle-double-left fa-angle-double-right');
}

/*  This makes sure that the logic is working properly for the classes.
    This ensures that if the sidebar is opened on a mobile device, the chat is hidden.
    It also make sure that there is not an d-none tag on the chat if the sidebar
    is closed. 
**/
function checkLoadingDisplays() {
    if ($( '#sidebar-container' ).hasClass( 'sidebar-collapsed' )) {
        $('.sidebar + .p-4').addClass('d-block'); 
    }
    else {
        $('.sidebar + .p-4').addClass('d-none'); 
    }
}

$( document ).ready(function() {
    if (screen.width < 750) {
        checkLoadingDisplays();
    }

    // adjust message tempate proportions
    if (screen.width < 800) {
        $('#img-col').addClass('col-2');
        $('#msg-col').addClass('col-10');
    }
});