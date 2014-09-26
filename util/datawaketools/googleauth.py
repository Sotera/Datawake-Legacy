

import httplib2
import json
import traceback
import datawakeconfig as constants
import time



"""
 Authenticates a user with google

 the auth request must come form a valid client ID registed with the google devopment console

 https://console.developers.google.com/project/apps~elevated-epoch-574/apiui/credential?authuser=0


"""


VALIDATE_TOKEN_URL = 'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=%s'
GET_PROFILE_URL = 'https://www.googleapis.com/plus/v1/people/%s?access_token=%s'
CLIENT_IDS = constants.CLIENT_IDS


#
# Validate token and return user id
#
def getUserFromToken(token):
    (userId,clientId,expires) = validateToken(token)
    user = getUserInfo(token,userId)
    return user

#
# validate an access token
#  if valid returns (userId,clientId,expires)
#  else raises a ValueError
#
def validateToken(token):
    if constants.MOCK_AUTH:
        return ('0','0',int(time.time())+300)
    url = (VALIDATE_TOKEN_URL % token)
    h = httplib2.Http()
    result = json.loads(h.request(url, 'GET')[1])

    if result.get('error') is not None:
        raise ValueError("Invalid access token")

    clientId = result.get('audience')
    if clientId not in CLIENT_IDS:
        raise ValueError("Token granted to unknown client: "+clientId)

    userId = result.get('user_id')
    if userId is None:
        raise ValueError("userId not returned by token validation. Ensure the profile scope was present in the request to create the access token")

    expires = int(result.get('expires_in')) + int(time.time())
    return (userId,clientId,expires)


#
# returns the users google plus profile
#
def getProfile(token,userId):
    if constants.MOCK_AUTH:
        return {'displayName':'John Doe','emails':[{'value':'john.doe@nomail.none'}]}
    url = (GET_PROFILE_URL % (userId,token))
    h = httplib2.Http()
    result = json.loads(h.request(url, 'GET')[1])

    if result.get('error') is not None:
        raise ValueError("Invalid access token or userId")
    return result


#
# get the users display name from their profile
#
def getUserInfo(token,userId):
    user = {}
    profile = getProfile(token,userId)
    user['userName'] = profile.get('displayName')
    user['userId'] = userId
    emails = profile.get('emails')
    if emails:
        user['email'] = emails[0]['value']
    else:
        user['email'] = ''
    return user
