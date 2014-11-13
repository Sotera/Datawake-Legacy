self.on("click", function (node, contextItemDataProperty) {
    var messageWrapper = {};
    if (contextItemDataProperty == "selection" || contextItemDataProperty == "feedback") {
        messageWrapper.text = window.getSelection().toString();
    }
    messageWrapper.intent = contextItemDataProperty;
    self.postMessage(messageWrapper);
});