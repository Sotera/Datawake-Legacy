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

import json
from elasticsearch import Elasticsearch
import tangelo
import cherrypy
import os

DEBUG = True
esauth = {}


try:
    esfile = open('/usr/local/share/tangelo/web/datawake/forensic/esauth.map')
    for line in esfile:
        url,credentials = line.split(' -> ')
        esauth[url.strip()] = credentials.strip()
except IOError:
    tangelo.log('No ES config file.  This is ok')

#
# Return the graph display options
#
def query(data):
    url = data['url']
    max_results_per_node = int(data['mrpn'])
    indd = data['index']
    search_terms = data['search_terms']
    es = Elasticsearch([url])
    if esauth.get(url) != None:
        cred = esauth[url]
        tangelo.log('http://' + cred + '@' + url)
        es = Elasticsearch(['http://' + cred + '@' + url])
    ind = indd
    rr = []
    num = 0
    for t in search_terms:
        if t['type'] == 'selection' or t['type'] == 'phone' or t['type'] == 'email' or t['type'] == 'info':
            num_to_search = t['id']
            if t['type'] == 'selection':
                num_to_search = t['data']
            if t['type'] == 'info':
                num_to_search = t['id'].split('->')[1].strip()
            results = es.search(index=ind,body={"size":max_results_per_node,"fields":["_index","_type","_id"],"query":{"match_phrase": {"_all": num_to_search}}})
            num += results['hits']['total']
            for hit in results['hits']['hits']:
                rr.append({'nid':t['id'],'search_term':num_to_search,'eid':hit['_id'],'itype':hit['_type'],'jindex':ind,'url':url})

    return json.dumps({'num':num,'hits':rr})

post_actions = {
'query': query,
}

@tangelo.restful
def post(action, *args, **kwargs):
    if 'user' not in cherrypy.session:
        return json.dumps(dict())
    post_data = json.loads(cherrypy.request.body.read())
    #tangelo.log(json.dumps(post_data))

    def unknown(**kwargs):
        return tangelo.HTTPStatusCode(400, "invalid service call")

    return post_actions.get(action, unknown)(**post_data)
