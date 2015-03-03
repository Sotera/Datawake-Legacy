# Firefox/Tor Add-on

## How to make the xpi file (you will need to make sure Python 2.7.x is installed on your system)
1. Pull down the latest Datawake source code from Github: https://github.com/Sotera/Datawake.git
2. Navigate to Datawake\browser-plugins\FFirefoxAddon and edit the package.json file.  There will be three instances of the IP Address "192.168.59.103", change this IP Address to match the Datawake instance that your FFirefoxAddon will use. 
3. Download the Firefox SDK and follow the instruction for your OS from:https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Installation
4. After unzipping, create a new folder called "packages" in the addon-sdk-1.x folder.
5. Download OAuthorizer from: https://github.com/mozilla/oauthorizer
6. Copy the oauthorizer-develop folder from step 3 into addon-sdk-1.x\packages folder you created.
7. In a command window execute "bin/activate", "source bin/activate", or "bash bin/activate" (based upon your operating system).  You should now have a prefix on your command prompt containing the name of the SDK's root directory. 
8. In that same command window, navigate to the Datawake\browser-plugins\FFirefoxAddon directory and run the command: "cfx xpi" .
9. Open Firefox/Tor, Add-Ons. Select "Install Add-on from File" and navigate to the .xpi file you created in step 8.
10.(Optional) Set up Google Authentication.

## Google Authentication
1. First you need to set up your native application keys on the [Google Developer Console](https://console.developers.google.com/).
2. Second you need to go to the [Add-on page](about:addons) for Firefox/Tor.
3. Check the box that says Use Google Authentication.
4. Fill in the boxes that contain your Client Secret and Client ID.
5. Open up a new tab and Google Auth should be displayed.

*(Note: This assumes you have the server set up for Google Auth as well.)*

## Notes
- If you are trying to use the add-on through Tor, your datawake plugin server must be visible to the open web or exposed as a [hidden service](https://www.torproject.org/docs/tor-hidden-service.html.en).

## Bugs
- Currently, whenever you return from the Google Auth window, your tab closes and reopens a new one.  This is due to a bug in the Firefox SDK. See: [Bug 942511](https://bugzilla.mozilla.org/show_bug.cgi?id=942511)
- This version of the extension may not work with the latest version of Firefox.  The target version is Firefox 24 due to the Tor browser.

## Permissions Explained
- Private Browsing needs to be enabled due to the Tor Browser settings.

## Google Permissions
- We only get your email and full name to authenticate.

