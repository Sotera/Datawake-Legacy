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

    TooltipView.prototype.show = function(spec) {
        this._canvas.remove();
        this._canvas = $(tooltipTemplate({
            labels : spec.labels
        }));
        this._parent.append(this._canvas);
        if (spec.orientation === 'NW') {
            this._canvas.offset({
                top : spec.y,
                left : spec.x
            });
        } else {
            this._canvas.offset({
                top : spec.y,
                left : spec.x - this._canvas.width()
            });
        }
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