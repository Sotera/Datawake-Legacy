import json

import tangelo

import datawake.util.db.datawake_mysql as db
import datawake.util.session.helper as session_helper
from datawake.util.validate.parameters import required_parameters


@session_helper.is_in_session
@required_parameters(['entity_type', 'entity_value', 'domain'])
def invalid_extraction(entity_type, entity_value, domain):
    user = session_helper.get_user()
    user_name = user.get_user_name()
    org = session_helper.get_org()
    success = db.mark_invalid_extracted_entity(user_name, entity_type, entity_value, domain, org) == 0
    return json.dumps(dict(success=success))


@session_helper.is_in_session
@required_parameters(['raw_text', 'entity_type', 'entity_value', 'url', 'domain'])
def good_extraction(raw_text, entity_type, entity_value, url, domain):
    org = session_helper.get_org()
    success = db.add_extractor_feedback(org, domain, raw_text, entity_type, entity_value, url) == 0
    return json.dumps(dict(success=success))


@session_helper.is_in_session
@required_parameters(['url', 'domain'])
def fetch_entities(domain, url):
    org = session_helper.get_org()
    entities = db.get_feedback_entities(org, domain, url)
    return json.dumps(dict(entities=entities))


@session_helper.is_in_session
@required_parameters(['domain'])
def marked_entities(domain):
    user = session_helper.get_user()
    user_name = user.get_user_name()
    org = session_helper.get_org()
    marked_entities_list = db.get_marked_entities(org, domain, user_name)
    return json.dumps(dict(marked_entities=marked_entities_list))


post_actions = {
    "marked": marked_entities,
    "bad": invalid_extraction,
    "good": good_extraction,
    "entities": fetch_entities
}


@tangelo.restful
def post(action, *arg, **kwargs):
    post_data = json.loads(tangelo.request_body().read())

    def unknown(*args):
        return tangelo.HTTPStatusCode(400, "invalid service call")

    return post_actions.get(action, unknown)(**post_data)
