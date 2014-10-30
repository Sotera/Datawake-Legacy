class User(object):
    def __init__(self, user_name, user_id, email):
        self.user_name = user_name
        self.user_id = user_id
        self.email = email
        self.org = None

    def get_user_name(self):
        return self.user_name

    def get_user_id(self):
        return self.user_id

    def get_org(self):
        return self.org

    def get_email(self):
        return self.email

    def set_org(self, org):
        self.org = org