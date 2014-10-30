import cherrypy

import datawake_exception

# TODO: If we add get requests to this, we should add a dictionary lookup for which method to service. See: Datawake scraper

def is_in_session(callback):
    def has_session(**kwargs):
        if 'user' in cherrypy.session:
            return callback(**kwargs)
        raise datawake_exception.SessionError(repr(callback), "No User in the current session")

    return has_session


def get_user():
    user = cherrypy.session.get('user')
    return user


def get_org():
    user = get_user()
    if user is not None:
        return user.get_org()

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
