self.on("click", function (node, contextItemDataProperty) {
    var messageWrapper = {};
    if (contextItemDataProperty == "selection") {
        messageWrapper.text = window.getSelection().toString();
    }
    messageWrapper.intent = contextItemDataProperty;
    self.postMessage(messageWrapper);
});