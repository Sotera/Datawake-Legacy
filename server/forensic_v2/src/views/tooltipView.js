define(['hbs!templates/tooltip'], function(tooltipTemplate) {

    function TooltipView(element,spec) {
        this._parent = element;
        this._canvas = null;
        this._initialize(element,spec);
    }

    TooltipView.prototype._initialize = function(element,spec) {
        this._canvas = $(tooltipTemplate(spec));
        this._canvas.appendTo(element);
    };

    TooltipView.prototype.show = function(labels,top,left) {
        this._canvas.remove();
        this._canvas = $(tooltipTemplate({
            labels : labels,
            top : top,
            left : left
        }));
        this._parent.append(this._canvas);
        // TODO:   bind handlers and what not
    };

    TooltipView.prototype.hide = function() {
        var c = this._canvas;
        c.animate({
            opacity : 0
        }, function() {
            c.remove();
        });
    };

    return TooltipView;
});