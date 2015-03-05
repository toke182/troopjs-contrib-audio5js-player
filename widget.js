define([
	"troopjs-contrib-audio5js/widget",
	"jquery",
	"./$duration",
	"./$position",
	"./$ready",
	"./$playing",
	"poly/array"
], function (Widget, $, $duration, $position, $ready, $playing) {
	var ARRAY_SLICE = Array.prototype.slice;
	var $ELEMENT = "$element";
	var SRC = "src";
	var DURATION = "duration";
	var CUE_IN = "cueIn";
	var CUE_OUT = "cueOut";
	var EVENTS = [
		"audio5js/canplay",
		"audio5js/error",
		"audio5js/play",
		"audio5js/pause",
		"audio5js/seeked",
		"audio5js/ended"
	];
	var METHODS = [
		"audio5js/do/play",
		"audio5js/do/pause",
		"audio5js/do/seek"
	];

	function load(src) {
		var me = this;
		var $element = me[$ELEMENT];

		$ready.call($element, false);

		return me
			.emit("audio5js/do/load", src)
			.ensure(function () {
				$ready.call($element, true);
			});
	}

	return Widget.extend(function ($element, name, src) {
		this[SRC] = src;
	}, {
		"sig/initialize": function () {
			var me = this;
			var cued = false;

			EVENTS.forEach(function (event) {
				me.on(event, function () {
					this[$ELEMENT].trigger(event, ARRAY_SLICE.call(arguments));
				});
			});

			METHODS.forEach(function (method) {
				me.on("dom/" + method, function ($event) {
					var args = ARRAY_SLICE.call(arguments);
					args[0] = method;
					this.emit.apply(this, args);
				});
			});

			me.on("audio5js/timeupdate", function (position, duration) {
				var me = this;
				var $element = me[$ELEMENT];
				var $data = $element.data();
				var cue_in = CUE_IN in $data
					? parseFloat($data[CUE_IN])
					: 0;
				var cue_out = CUE_OUT in $data
					? parseFloat($data[CUE_OUT])
					: duration;

				var position_cue = Math.max(cue_in, Math.min(position, cue_out)) - cue_in;
				var duration_cue = Math.max(cue_in, Math.min(duration, cue_out)) - cue_in;

				$position.call($element, position_cue, duration_cue);

				if (cued === true) {
					return;
				}
				else if (position !== 0 && position < cue_in) {
					cued = true;
					return me
						.emit("audio5js/do/pause")
						.tap(function () {
							return me.emit("audio5js/do/seek", cue_in);
						})
						.tap(function () {
							return me.emit("audio5js/do/play");
						})
						.ensure(function () {
							cued = false;
						});
				}
				else if ( position !== duration && position > cue_out || duration - position <= 0.2) {
					cued = true;
					return me
						.emit("audio5js/do/pause")
						.tap(function () {
							return me.emit("audio5js/do/seek", cue_in);
						})
						.tap(function () {
							return me.emit("audio5js/ended");
						})
						.ensure(function () {
							cued = false;
						});
				}
			});
		},

		"sig/start": function () {
			var me = this;

			if (me.hasOwnProperty(SRC)) {
				load.call(me, me[SRC]);
			}
		},

		"sig/stop": function () {
			return this.emit("audio5js/do/pause");
		},

		"on/audio5js/progress": function () {
			var me = this;
			var $element = me[$ELEMENT];
			var $data = $element.data();
			var cue_in = CUE_IN in $data
				? parseFloat($data[CUE_IN])
				: 0;
			var cue_out = CUE_OUT in $data
				? parseFloat($data[CUE_OUT])
				: me.prop(DURATION);

			$duration.call($element, cue_out - cue_in);
		},

		"on/audio5js/play": function () {
			$playing.call(this[$ELEMENT], true);
		},

		"on/audio5js/pause": function () {
			$playing.call(this[$ELEMENT], false);
		},

		"dom/audio5js/do/load": function ($event, src) {
			load.call(this, src);
		},

		"dom:[data-action='play']/click": function () {
			this[$ELEMENT].trigger("audio5js/do/play");
		}
	});
});