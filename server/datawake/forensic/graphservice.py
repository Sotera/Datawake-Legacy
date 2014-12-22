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

import tangelo

from datawake.util.db import datawake_mysql
from datawake.util.graph import helper as graph_helper
from datawake.util.session.helper import is_in_session
from datawake.util.session import helper


"""

Serves graphs for the datawake forensic viewer.  Graph building is primailry done in datawake.util.graphs

"""

DEBUG = True


#
# Return the graph display options
#
@is_in_session
def listGraphs():
    return json.dumps(dict(graphs=['none',
                                   'browse path',
                                   'browse path - with adjacent urls',
                                   'browse path - with adjacent urls min degree 2',
                                   'browse path - with adjacent phone #\'s',
                                   'browse path - with adjacent email #\'s',
                                   'browse path - with text selections',
                                   'browse path- with look ahead',
                                   'browse path - with adjacent info',]))


#
# Return list of trails with user and size counts
#
@is_in_session
def getTrails():
    org = helper.get_org()
    results = datawake_mysql.getTrailsWithUserCounts(org)
    results.insert(0, {})
    return json.dumps(results)


#
# return all time stamps from the selected trail,users,org
# returns a dictionary of the form  {'min':0,'max':0,'data':[]}
#
@is_in_session
def getTimeWindow(users, trail=u'*'):
    org = helper.get_org()
    if trail == u'':
        trail = u'*'
    print 'getTimeWindow(', users, ',', trail, ')'
    if len(users) > 0:
        users = users.split(",")
    else:
        users = []
    return json.dumps(datawake_mysql.getTimeWindow(org, users, trail))


#
# Return users within an org who have been active on at least one trail
# returns a list of dicts, {name:_, id:_}
#
@is_in_session
def listUsers():
    org = helper.get_org()
    return json.dumps(datawake_mysql.getActiveUsers(org))



@is_in_session
def getGraph(name, startdate=u'', enddate=u'', users=u'', trail=u'*', domain=u''):
    org = helper.get_org()
    if trail == u'':
        trail = u'*'
    userlist = map(lambda x: x.replace('\"', '').strip(), users.split(','))
    userlist = filter(lambda x: len(x) > 0, userlist)
    tangelo.log('getGraph( ' + str(name) + ',' + str(startdate) + ',' + str(enddate) + ',' + str(userlist) + ',' + str(trail) + ',' + str(domain) + ')')

    if name == 'browse path':
        graph = graph_helper.getBrowsePathEdges(org, startdate, enddate, userlist, trail, domain)
        return json.dumps(graph_helper.processEdges(graph['edges'], graph['nodes']))

    if name == 'browse path - with adjacent urls':
        graph = graph_helper.getBrowsePathAndAdjacentWebsiteEdgesWithLimit(org, startdate, enddate, 1, userlist, trail, domain)
        return json.dumps(graph_helper.processEdges(graph['edges'], graph['nodes']))

    if name == 'browse path - with connected entities min degree 2':
        rows = graphs.getBrowsePathAndAdjacentEntitiesWithLimit(org,startdate,enddate,2,userlist,trail,domain)
        return json.dumps(rows)

    if name == 'browse path - with adjacent urls min degree 2':
        graph = graph_helper.getBrowsePathAndAdjacentWebsiteEdgesWithLimit(org, startdate, enddate, 2, userlist, trail, domain)
        return json.dumps(graph_helper.processEdges(graph['edges'], graph['nodes']))

    if name == 'browse path - with adjacent phone #\'s':
        graph = graph_helper.getBrowsePathAndAdjacentPhoneEdgesWithLimit(org, startdate, enddate, 1, userlist, trail, domain)
        return json.dumps(graph_helper.processEdges(graph['edges'], graph['nodes']))

    if name == 'browse path - with adjacent email #\'s':
        graph = graph_helper.getBrowsePathAndAdjacentEmailEdgesWithLimit(org, startdate, enddate, 1, userlist, trail, domain)
        return json.dumps(graph_helper.processEdges(graph['edges'], graph['nodes']))

    if name == 'browse path - with text selections':
        graph = graph_helper.getBrowsePathWithTextSelections(org, startdate, enddate, userlist, trail, domain)
        return json.dumps(graph_helper.processEdges(graph['edges'], graph['nodes']))

    if name == 'browse path- with look ahead':
        graph = graph_helper.getBrowsePathWithLookAhead(org, startdate, enddate, userlist, trail, domain)
        return json.dumps(graph_helper.processEdges(graph['edges'], graph['nodes']))

    if name == 'browse path - with adjacent info':
        graph = graph_helper.getBrowsePathAndAdjacentInfoEdges(org, startdate, enddate,1,userlist, trail, domain)
        return json.dumps(graph_helper.processEdges(graph['edges'], graph['nodes']))

    return json.dumps(dict(nodes=[], links=[]))


get_actions = {
    'list': listGraphs,
    'getusers': listUsers,
    'trails': getTrails
}

post_actions = {
    'timewindow': getTimeWindow,
    'get': getGraph,
}


@tangelo.restful
def post(action, *args, **kwargs):
    post_data = json.loads(tangelo.request_body().read())

    def unknown(**kwargs):
        return tangelo.HTTPStatusCode(400, "invalid service call")

    return post_actions.get(action, unknown)(**post_data)


@tangelo.restful
def get(action, *args, **kwargs):
    def unknown(**kwargs):
        return tangelo.HTTPStatusCode(400, "invalid service call")

    return get_actions.get(action, unknown)(**kwargs)
