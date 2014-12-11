define([], function() {
	var palette = {
		primary: ['#86A156', '#A4D44E', '#7D9C46', '#749638', '#688D26'],
		secondary: ['#C67F26', '#FB8C00', '#E28004', '#A67940', '#856C4D'],
		tertiary: ['#3D3582', '#3B2EAD', '#3E3398', '#3B356F', '#343154']
	};

	var NODE_STROKE_WIDTH = 4;

	return {
		BROWSE_PATH_LINK : {
			STROKE_STYLE : '#232323',
			LINE_WIDTH : 3,
			LINE_TYPE : GraphJS.LINK_TYPE.ARROW
		},
		ENTITY_LINK : {
			STROKE_STYLE : '#232323',
			LINE_WIDTH : 1,
			LINE_TYPE : GraphJS.LINK_TYPE.LINE
		},
		BROWSE_PATH_ENTITY : {
			FILL_STYLE : palette.primary[0],
			STROKE_STYLE : palette.primary[palette.primary.length-1],
			STROKE_WIDTH : NODE_STROKE_WIDTH
		},
		EMAIL_ENTITY : {
			FILL_STYLE : palette.secondary[0],
			STROKE_STYLE : palette.secondary[palette.secondary.length-1],
			STROKE_WIDTH : NODE_STROKE_WIDTH
		},
		PHONE_ENTITY : {
			FILL_STYLE : palette.tertiary[0],
			STROKE_STYLE : palette.tertiary[palette.tertiary.length-1],
			STROKE_WIDTH : NODE_STROKE_WIDTH
		},
		WEBSITE_ENTITY : {
			FILL_STYLE : palette.primary[0],
			STROKE_STYLE : palette.primary[palette.primary.length-1],
			STROKE_WIDTH : NODE_STROKE_WIDTH
		},
		LABEL : {
			FONT_FAMILY : '"Helvetica Neue"',
			FONT_HEIGHT : 14,
			FILL_STYLE : '#333'
		},
		showLegendOnStart : true,
		fitPadding : 100				// padding around fit graph
	};
});
