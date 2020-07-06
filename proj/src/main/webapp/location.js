function getLocation() {
    return fetch('/location').then(response => response.json()).then((loc) => {
        return loc;
    });
}