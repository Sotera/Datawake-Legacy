"""

 Copyright 2014 Sotera Defense Solutions, Inc.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.

"""

import re
import threading
from Queue import Queue
import json

import tangelo
from datawake.util import datawake_db as db
import datawake.util.entity_data_connector_factory as factory
from datawake.util.domain_upload_connector import ConnectorUtil


completed_threads = Queue()


def get_domains(*args):
    domains = db.get_domains()
    return json.dumps(map(lambda x: dict(name=x[0], description=x[1]), domains))


def get_preview(*args, **kwargs):
    domain_content_connector = factory.getEntityDataConnector()
    try:
        name = kwargs.get("domain")
        data = domain_content_connector.get_domain_items(name, 10)
        return json.dumps(data)
    finally:
        domain_content_connector.close()


def valid_domain_line(line):
    if '\0' not in line:
        return True
    else:
        return False


def finished_database_upload(*args):
    if not completed_threads.empty():
        return json.dumps(completed_threads.get())
    else:
        return json.dumps(dict(complete=False))


def upload_file(*args, **kwargs):
    domain_content_connector = factory.getEntityDataConnector()
    try:
        domain_file = kwargs.get("file_upload")
        domain_name = kwargs.get("name")
        domain_description = kwargs.get("description")
        if not db.domain_exists(domain_name):
            if domain_file is not None:
                tangelo.log("read domain file")
                domain_file_lines = domain_file.file.readlines()
                domain_file_lines = map(lambda x: x.strip(), domain_file_lines)
                db.add_new_domain(domain_name, domain_description)
                return json.dumps(dict(success=domain_content_connector.add_new_domain_items(map(lambda x: "%s\0%s" % (domain_name, re.sub(",", "\0", x)), domain_file_lines))))
            else:
                return json.dumps(dict(success=False))
        else:
            return json.dumps(dict(success=False))
    finally:
        domain_content_connector.close()


def upload_database_threaded(**kwargs):
    domain_content_connector = factory.getEntityDataConnector()
    domain_name = kwargs.get("domain_name")
    connection_string = kwargs.get("connection_string")
    domain_description = kwargs.get("domain_description")
    table_name = kwargs.get("table_name")
    attribute_column = kwargs.get("attribute_column")
    value_column = kwargs.get("value_column")
    connector = ConnectorUtil.get_database_connector(connection_string, table_name, attribute_column, value_column)
    rows = connector.get_domain_items()
    success = domain_content_connector.add_new_domain_items(map(lambda items: "%s\0%s\0%s" % (domain_name, items[0], items[1]), rows))
    complete_dict = dict(domain=domain_name, description=domain_description, success=success, complete=True)
    completed_threads.put(complete_dict)


def upload_database(*args, **kwargs):
    domain_name = kwargs.get("domain_name")
    domain_description = kwargs.get("domain_description")
    if not db.domain_exists(domain_name):
        db.add_new_domain(domain_name, domain_description)
        database_upload_thread = threading.Thread(target=upload_database_threaded, kwargs=kwargs)
        database_upload_thread.daemon = True
        database_upload_thread.start()
        return {'success': True}
    else:
        return {'success': False}


def delete_domain(*args, **kwargs):
    domain_name = kwargs.get("domain_name")
    for key in kwargs.keys():
        tangelo.log(key)
    if db.domain_exists(domain_name):
        domain_content_connector = factory.getEntityDataConnector()
        db.remove_domain(domain_name)
        domain_content_connector.delete_domain_items(domain_name)
        return json.dumps(dict(success=True))
    else:
        return json.dumps(dict(success=False))


get_actions = {
    'domains': get_domains,
    'poll': finished_database_upload
}

post_actions = {
    'upload': upload_file,
    'preview': get_preview,
    'upload-database': upload_database,
    'delete': delete_domain
}


@tangelo.restful
def post(action, *args, **kwargs):
    def unknown(*args):
        return tangelo.HTTPStatusCode(400, "invalid service call")

    return post_actions.get(action, unknown)(*args, **kwargs)


@tangelo.restful
def get(action, *args, **kwargs):
    def unknown(*args):
        return tangelo.HTTPStatusCode(400, "invalid service call")

    return get_actions.get(action, unknown)(*args)
