var Client = require('node-rest-client').Client;
var colors = require('colors');
var _ = require('underscore');
var Table = require('easy-table');

var context = require('./context.js');
var login = require('../util/login.js');
var printObject = require('../util/printObject.js');
var dotfile = require('../util/dotfile.js');

module.exports = {
	doRule: function(action, cmd) {
		if (action === 'list') {
			module.exports.list(cmd);
		}
		else if (action === 'create') {
			module.exports.create(cmd);
		}
		else if (action === 'update') {
			module.exports.update(cmd);
		}
		else if (action === 'delete') {
			module.exports.del(cmd);
		}
		else {
			console.log('You must specify an action: list, create, update or delete');
			//program.help();
		}
	},
	
	list: function (cmd) {
		var client = new Client();
		
		var loginInfo = login.login(cmd);
		if ( ! loginInfo)
			return;
		var url = loginInfo.url;
		var apiKey = loginInfo.apiKey;
		
		var projIdent = cmd.project_ident;
		if ( ! projIdent) {
			projIdent = dotfile.getCurrentProject();
			if ( ! projIdent) {
				console.log('There is no current project.'.yellow);
				return;
			}
		}

		client.get(url + "/rules?filter=project_ident=" + projIdent, {
			headers: {
				Authorization: "Espresso " + apiKey + ":1"
			}
		}, function(data) {
			if (data.errorMessage) {
				console.log(data.errorMessage.red);
				return;
			}
			printObject.printHeader('Rules');
			var table = new Table();
			var tblWidth = 0;
			var typeWidth = 0;
			_.each(data, function(p) {
				table.cell("Ident", p.ident);
				table.cell("Table", p.entity_name);
				tblWidth = p.entity_name.length > tblWidth ? p.entity_name.length : tblWidth;
				var type = "";
				switch(p.ruletype_ident) {
					case 1: type = "sum"; break;
					case 2: type = "count"; break;
					case 3: type = "formula"; break;
					case 4: type = "parent copy"; break;
					case 5: type = "validation"; break;
					case 6: type = "commit validation"; break;
					case 7: type = "event"; break;
					case 8: type = "early event"; break;
					case 9: type = "commit event"; break;
					case 11: type = "minimum"; break;
					case 12: type = "maximum"; break;
					case 13: type = "managed parent"; break;
					default: type = "unknown";
				}
				typeWidth = type.length > typeWidth ? type.length : typeWidth;
				
				var maxWidth = printObject.getScreenWidth() - (tblWidth + typeWidth + 11+ 2);
				var maxColWidth = (maxWidth / 2) - 3;
				
				table.cell("Type", type);
				var autoName = p.auto_name;
				if (autoName.length > maxColWidth) {
					autoName = autoName.substring(0, (maxColWidth - 3)) + "...";
				}
				table.cell("Description", autoName.replace(/\n/g, ''));
				var comments = p.comments;
				if (comments) {
					comments = comments.replace(/\n/g, '');
				}
				if ( ! comments) {
					comments = "";
				}
				else if (comments.length > maxColWidth){
					comments = comments.substring(0, (maxColWidth - 3)) + "...";
				}
				table.cell("Comments", comments);
				table.newRow();
			});
			if (data.length === 0) {
				console.log('There is no rule defined for this project'.yellow);
			}
			else {
				table.sort(['Table', 'Type', 'Description']);
				console.log(table.toString());
			}
			printObject.printHeader("# rules: " + data.length);
		});
	},
	
	create: function(cmd) {
		var client = new Client();
		var loginInfo = login.login(cmd);
		if ( ! loginInfo)
			return;
		if ( ! cmd.ruletype) {
			console.log('Missing parameter: ruletype'.red);
			return;
		}
		cmd.ruletype = cmd.ruletype.toLowerCase();
		switch(cmd.ruletype) {
			case 'sum': cmd.ruletype = 1; break;
			case 'count': cmd.ruletype = 2; break;
			case 'formula': cmd.ruletype = 3; break;
			case 'parentcopy': cmd.ruletype = 4; break;
			case 'validation': cmd.ruletype = 5; break;
			case 'commitvalidation': cmd.ruletype = 6; break;
			case 'event': cmd.ruletype = 7; break;
			case 'earlyevent': cmd.ruletype = 8; break;
			case 'commitevent': cmd.ruletype = 9; break;
			case 'minimum': cmd.ruletype = 11; break;
			case 'maximum': cmd.ruletype = 12; break;
			case 'managedparent': cmd.ruletype = 13; break;
			default: console.log('Invalid rule type'.red); return;
		}
		if ( ! cmd.entity_name) {
			console.log('Missing parameter: entity_name'.red);
			return;
		}
		if ( ! cmd.entity_name.match(/\w+:\w+/)) {
			console.log('Parameter entity_name must have the format prefix:table'.red);
			return;
		}
		if (cmd.active) {
			cmd.active = (cmd.active.toLowerCase() === 'true');
		}
		else {
			cmd.active = true;
		}

		if ( ! cmd.attribute_name && (cmd.ruletype==1 || cmd.ruletype==2 || cmd.ruletype==3 || cmd.ruletype==4 || 
				cmd.ruletype==11 || cmd.ruletype==12)) {
			console.log('Missing parameter: attribute_name'.red);
			return;
		}
		
		var rule_text1 = null;
		var rule_text2 = null;
		var rule_text3 = null;
		
		// Sum
		if (cmd.ruletype == 1) {
			if ( ! cmd.role_name) {
				console.log('Missing parameter: role_name'.red);
				return;
			}
			if ( ! cmd.child_attribute) {
				console.log('Missing parameter: child_attribute'.red);
				return;
			}
			rule_text1 = cmd.role_name;
			rule_text2 = cmd.clause;
			rule_text3 = cmd.child_attribute;
		}
		
		// Formula
		var prop4 = null;
		if (cmd.ruletype === 3) {
			if ( ! cmd.expression) {
				console.log('Missing parameter: expression'.red);
				return;
			}
			rule_text1 = cmd.expression;
			prop4 = 'javascript';
		}
		
		// Validation
		if (cmd.ruletype === 5 || cmd.ruletype === 6) {
			if ( ! cmd.expression) {
				console.log('Missing parameter: expression'.red);
				return;
			}
			rule_text1 = cmd.expression;
			prop4 = 'javascript';
			rule_text2 = cmd.error_message;
		}
		
		// Parent copy
		if (cmd.ruletype == 4) {
			if ( ! cmd.role_name) {
				console.log('Missing parameter: role_name'.red);
				return;
			}
			if ( ! cmd.parent_attribute) {
				console.log('Missing parameter: parent_attribute'.red);
				return;
			}
			rule_text1 = cmd.role_name;
			rule_text2 = cmd.parent_attribute;
		}

		var curProj = cmd.project_ident;
		if ( ! curProj) {
			curProj = dotfile.getCurrentProject();
		}
		if ( ! curProj) {
			console.log('There is no current project.'.yellow);
			return;
		}
		
		var newRule = {
			entity_name: cmd.entity_name,
			attribute_name: cmd.attribute_name,
			prop4: prop4,
			rule_text1: rule_text1,
			rule_text2: rule_text2,
			rule_text3: rule_text3,
			name: cmd.rule_name,
			comments: cmd.comments,
			active: cmd.active,
			ruletype_ident: cmd.ruletype,
			project_ident: curProj
		};
		var startTime = new Date();
		client.post(loginInfo.url + "/rules", {
			data: newRule,
			headers: {
				Authorization: "Espresso " + loginInfo.apiKey + ":1"
			}
		}, function(data) {
			var endTime = new Date();
			if (data.errorMessage) {
				console.log(data.errorMessage.red);
				return;
			}
			printObject.printHeader('Rule was created');
			_.each(data.txsummary, function(obj) {
				printObject.printObject(obj, obj['@metadata'].entity, 0, obj['@metadata'].verb);
			});
			var trailer = "Request took: " + (endTime - startTime) + "ms";
			trailer += " - # objects touched: ";
			if (data.txsummary.length == 0) {
				console.log('No data returned'.yellow);
			}
			else {
				trailer += data.txsummary.length;
			}
			printObject.printHeader(trailer);
		});
	},
	
	update: function(cmd) {
		console.log('Sorry, this function is not yet implemented');
	},
	
	del : function(cmd) {
		var client = new Client();
		var loginInfo = login.login(cmd);
		if ( ! loginInfo) {
			console.log('You are not currently logged into any Espresso Logic server.'.red);
			return;
		}

		var filt = null;
		if (cmd.ident) {
			filt = "ident='" + cmd.ident + "'";
		}
		else if (cmd.rule_name) {
			filt = "name='" + cmd.rule_name + "'";
		}
		else {
			console.log('Missing parameter: please specify either name or ident'.red);
			return;
		}
		
		client.get(loginInfo.url + "/rules?filter=" + filt, {
			headers: {
				Authorization: "Espresso " + loginInfo.apiKey + ":1"
			}
		}, function(data) {
			//console.log('get result: ' + JSON.stringify(data, null, 2));
			if (data.errorMessage) {
				console.log(("Error: " + data.errorMessage).red);
				return;
			}
			if (data.length === 0) {
				console.log(("Error: no such database").red);
				return;
			}
			if (data.length > 1) {
				console.log(("Error: more than one database for the given condition: " + filter).red);
				return;
			}
			var db = data[0];
			var startTime = new Date();
			client['delete'](db['@metadata'].href + "?checksum=" + db['@metadata'].checksum, {
				headers: {
					Authorization: "Espresso " + loginInfo.apiKey + ":1"
				}
			}, function(data2) {
				var endTime = new Date();
				if (data2.errorMessage) {
					console.log(data2.errorMessage.red);
					return;
				}
				printObject.printHeader('Database connection was deleted, including the following objects:');
				_.each(data2.txsummary, function(obj) {
					printObject.printObject(obj, obj['@metadata'].entity, 0, obj['@metadata'].verb);
				});
				var trailer = "Request took: " + (endTime - startTime) + "ms";
				trailer += " - # objects touched: ";
				if (data2.txsummary.length == 0) {
					console.log('No data returned'.yellow);
				}
				else {
					trailer += data2.txsummary.length;
				}
				printObject.printHeader(trailer);
			});
		});
	}
};
