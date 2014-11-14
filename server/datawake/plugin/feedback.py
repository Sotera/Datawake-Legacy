import json

import tangelo

import datawake.util.db.datawake_mysql as db
import datawake.util.session.helper as session_helper
import datawake.util.dataconnector.factory as factory


@session_helper.is_in_session
def bad_extraction(entity_type, entity_value, domain):
    user = session_helper.get_user()
    user_name = user.get_user_name()
    data_connector = factory.get_entity_data_connector()
    success = data_connector.mark_invalid_extracted_entity(user_name, entity_type, entity_value, domain) == 0
    return json.dumps(dict(success=success))


@session_helper.is_in_session
def good_extraction(raw_text, entity_type, entity_value, url, domain):
    success = db.add_extractor_feedback(domain, raw_text, entity_type, entity_value, url) == 0
    return json.dumps(dict(success=success))


@session_helper.is_in_session
def fetch_entities(domain, url):
    tangelo.log(domain)
    data_connector = factory.get_entity_data_connector()
    entities = data_connector.get_feedback_entities(domain, url)
    return json.dumps(dict(entities=entities))


post_actions = {
    "bad": bad_extraction,
    "good": good_extraction,
    "entities": fetch_entities
}


@tangelo.restful
def post(action, *arg, **kwargs):
    post_data = json.loads(tangelo.request_body().read())

    def unknown(*args):
        return tangelo.HTTPStatusCode(400, "invalid service call")

    return post_actions.get(action, unknown)(**post_data)
