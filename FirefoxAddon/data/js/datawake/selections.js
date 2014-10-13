self.on("click", function (node, data) {
    var message = {};
    if (data == "selection") {
        message.text = window.getSelection().toString();
    }
    message.intent = data;
    self.postMessage(message);
});