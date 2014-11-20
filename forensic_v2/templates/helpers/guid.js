define('templates/helpers/guid', ['hbs/handlebars','guid'], function ( Handlebars, guidModule ) {

	function guid() {
		return guidModule.generate();
	}

	Handlebars.registerHelper( 'guid', guid );
	return guid;
});