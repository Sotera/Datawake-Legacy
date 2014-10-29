import cherrypy


# TODO: If we add get requests to this, we should add a dictionary lookup for which method to service. See: Datawake scraper

def get_user():
    if is_in_session():
        user = cherrypy.session.get('user')
        if user_has_org(user):
            return user
    return None


def is_in_session():
    return 'user' in cherrypy.session


def user_has_org(user):
    return 'org' in user


def get_org():
    user = get_user()
    if user is not None:
        return user.get('org')

    return None


def get_token():
    return cherrypy.session.get('token')


def is_token_in_session():
    return 'token' in cherrypy.session


def expire_user():
    if 'user' in cherrypy.session:
        del cherrypy.session['user']
    if 'token' in cherrypy.session:
        del cherrypy.session['token']
    cherrypy.lib.sessions.expire()
    return True

def set_user(user):
    cherrypy.session['user'] = user
    return True

def set_token(token):
    cherrypy.session['token'] = token
    return True





