//Run: NODE_PATH=./app.nw/node_modules/ node geniss.js
var fs = require('fs');
var iss = '#define FrappName "Frapp"\n\
#define FrappVersion "' + JSON.parse(fs.readFileSync('app.nw/package.json')).version + '"\n\
#define FrappPublisher "Daniel Esteban Nombela"\n\
#define FrappURL "https://github.com/danielesteban/Frapp"\n\
#define FrappExeName "Frapp.exe"\n\
\n\
[Setup]\n\
AppId={{343EF05E-6FDA-494F-9127-EE3F33A8A23E}\n\
AppName={#FrappName}\n\
AppVersion={#FrappVersion}\n\
AppVerName={#FrappName} v{#FrappVersion}\n\
AppPublisher={#FrappPublisher}\n\
AppPublisherURL={#FrappURL}\n\
AppSupportURL={#FrappURL}\n\
AppUpdatesURL={#FrappURL}\n\
DefaultDirName={pf}\\{#FrappName}\n\
DefaultGroupName={#FrappName}\n\
;SetupIconFile={#FrappName}.ico\n\
Compression=lzma2\n\
SolidCompression=yes\n\
OutputDir=.\n\
OutputBaseFilename=Frapp-win32\n\
\n\
[Languages]\n\
Name: "english"; MessagesFile: "compiler:Default.isl"\n\
Name: "spanish"; MessagesFile: "compiler:Languages\\Spanish.isl"\n\
\n\
[Tasks]\n\
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked\n\
\n\
[Files]\n\
Source: "{#FrappExeName}"; DestDir: "{app}"; Flags: ignoreversion\n\
Source: "ffmpegsumo.dll"; DestDir: "{app}"; Flags: ignoreversion\n\
Source: "icudt.dll"; DestDir: "{app}"; Flags: ignoreversion\n\
Source: "libEGL.dll"; DestDir: "{app}"; Flags: ignoreversion\n\
Source: "libGLESv2.dll"; DestDir: "{app}"; Flags: ignoreversion\n\
;Source: "{#FrappName}.ico"; DestDir: "{app}"; Flags: ignoreversion\n\
Source: "nw.pak"; DestDir: "{app}"; Flags: ignoreversion\n\
Source: "package.nw"; DestDir: "{app}"; Flags: ignoreversion\n\
Source: "sources\\Frapp.json"; DestDir: "{app}\\sources"; Flags: ignoreversion\n',
issBottom = '\n[Icons]\n\
;Name: "{group}\\{#FrappName}"; Filename: "{app}\\{#FrappExeName}"; IconFilename: "{app}\\{#FrappName}.ico"\n\
Name: "{group}\\{#FrappName}"; Filename: "{app}\\{#FrappExeName}";\n\
Name: "{group}\\{cm:UninstallProgram,{#FrappName}}"; Filename: "{uninstallexe}"\n\
;Name: "{commondesktop}\\{#FrappName}"; Filename: "{app}\\{#FrappExeName}"; IconFilename: "{app}\\{#FrappName}.ico"; Tasks: desktopicon\n\
Name: "{commondesktop}\\{#FrappName}"; Filename: "{app}\\{#FrappExeName}"; Tasks: desktopicon\n\
\n\
[Run]\n\
Filename: "{app}\\{#FrappExeName}"; Description: "{cm:LaunchProgram,{#FrappName}}"; Flags: nowait postinstall skipifsilent\n';

var dir = require('node-dir'),
	path = require('path'),
	frapps = [
		'FrappEditor',
		'FrappInstaller',
		'FrappMenu',
		'FrappSignin'
	],
	frappsDir = 'frapps/danielesteban/',
	listFrapps = function() {
		if(!frapps.length) return cb();
		var frapp = frapps.shift(),
			frappDir = frappsDir + frapp;

		iss += '\n;' + frapp + '\n';
		dir.files(frappDir, function(err, files) {
			files.forEach(function(file) {
				if(file.indexOf(frappDir + '/.git/') === 0 || path.basename(file) === '.DS_Store') return;
				iss += 'Source: "' + file.replace(/\//g, '\\') + '"; DestDir: "{app}\\' + path.dirname(file).replace(/\//g, '\\') + '"; Flags: ignoreversion\n';
			});
			listFrapps();
		});
	},
	cb = function() {
		iss += issBottom;
		fs.writeFile('./setup.iss', iss, function() {
			console.log('Done!');
		});
	};

listFrapps();
