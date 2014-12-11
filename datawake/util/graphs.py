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
import igraph
import datawake.util.entity_data_connector_factory as factory
from datawake.util import datawake_db
import tangelo
import tldextract

"""

Provides all the functionality around building graphs for display on the datawake
forensic view.

"""

entityDataConnector = factory.getEntityDataConnector()


def getBrowsePathEdges(org,startdate,enddate,userlist=[],trail='*',domain=''):
    print 'getBrowsePathEdges(',startdate,',',enddate,',',userlist,')'
    org = org.upper()
    command = """SELECT unix_timestamp(t1.ts) as ts, t1.url,hits,userName,userId,id,trail
                 FROM datawake_data as t1 LEFT JOIN (select url,count(url) as hits from datawake_data WHERE org = %s and domain = %s group by url ) as t2 ON t1.url = t2.url
                 WHERE t1.org = %s and t1.domain = %s
              """
    commandArgs = [org,domain,org,domain]

    # add the time filter to the query
    if (startdate == '' and enddate == ''):
        pass
    elif (startdate != '' and enddate == ''):
        command = command +" AND unix_timestamp(t1.ts) >= %s "
        commandArgs.append(startdate)
    elif (startdate == '' and enddate != ''):
        command = command + "  AND unix_timestamp(t1.ts) <= %s "
        commandArgs.append(enddate)
    else:
        command = command + " AND unix_timestamp(t1.ts) >= %s and unix_timestamp(t1.ts) <= %s "
        commandArgs.append(startdate)
        commandArgs.append(enddate)

    # add the user filter
    if (len(userlist) > 0):
        command = command +" AND "
        params = ['%s' for i in range(len(userlist))]
        params = ','.join(params)
        command = command + "  userId in ("+params+") "
        commandArgs.extend(userlist)

    # add the trail filter
    if trail != '*':
        command = command +" AND "
        command = command + " trail = %s"
        commandArgs.append(trail)

    command = command + " ORDER BY userId,t1.ts asc"
    rows = datawake_db.dbGetRows(command,commandArgs)


    edges = []
    nodes = {}
    edge_buffer = []
    for row in rows:
        (ts,url,hits,username,userId,postId,trail) = row
        if trail is None or trail.strip() == '': trail = "default"

        if url not in nodes:
            nodes[url] = {'id':url,
                              'type':'browse path ',
                              'size':10,
                              'timestamps':[],
                              'hits':0,
                              'userNames':[],
                              'userIds':[],
                              'postIds':[],
                              'trails':[]
            }
        nodes[url]['timestamps'].append(ts)
        nodes[url]['hits'] = hits
        nodes[url]['userNames'].append(username)
        nodes[url]['userIds'].append(userId)
        nodes[url]['postIds'].append(postId)
        nodes[url]['trails'].append(trail)

        edge_buffer.append(url)
        if len(edge_buffer) == 2:
            if (edge_buffer[0] != edge_buffer[1]):
                if 'chrome://newtab/' not in edge_buffer[1]:
                    users1 = nodes[edge_buffer[0]]['userIds'][-1]
                    users2 = nodes[edge_buffer[1]]['userIds'][-1]
                    if users1 == users2:
                        edges.append((edge_buffer[0],edge_buffer[1]))
            edge_buffer = [edge_buffer[1]]


    # set group name from each node
    for key,value in nodes.iteritems():
        domain = 'n/a'
        if '//' in key:  domain =  key.split('/')[2]
        value['groupName'] = domain

    if len(userlist) == 1 and trail != '*':
        nodes = addUrlRankstoNodes(org,nodes,userlist[0],trail,domain=domain)

    return {'nodes':nodes,'edges':edges}


def getBrowsePathAndAdjacentEdgesWithLimit(org,startdate,enddate,adjTypes,limit,userlist=[],trail='*',domain=''):
    entityDataConnector.close()

    browsePathGraph = getBrowsePathEdges(org,startdate,enddate,userlist,trail,domain)
    urls = browsePathGraph['nodes'].keys()


    # for every url in the browse path get all extracted entities
    results = entityDataConnector.getExtractedEntitiesWithDomainCheck(urls,adjTypes,domain=domain)


    nodes = browsePathGraph['nodes']
    edges = browsePathGraph['edges']


    # pivot on entity->urls
    entity_to_urls = {}
    for url,entityObjDict in results.iteritems():
        for type,valueDict in entityObjDict.iteritems():
            for value,in_domain in valueDict.iteritems():
                key = (type,value)
                if key not in entity_to_urls:
                    entity_to_urls[key] = {'indomain':'n','urls':set([])}
                entity_to_urls[key]['urls'].add(url)
                if (in_domain == 'y'): entity_to_urls[key]['indomain'] = 'y'

    # add entities with at least <limit> urls
    for key,value in entity_to_urls.iteritems():
        if len(value['urls']) >= limit:
            (type,name) = key
            #name = name.encode()
            group = ''
            if type == 'website':
                if '//' in name:  group =  name.split('/')[2]
            elif type == 'phone':
                group = 'length= '+str( len(name))
            elif type == 'email' and '@' in name:
                group = name.split('@')[1]
            node = {'id':name,
                    'type':type,
                    'size':5,
                    'groupName':group
            }
            if name not in nodes:
              nodes[name]= node
            for url in value['urls']:
                edges.append((url,name))

    entityDataConnector.close()
    return {'nodes':nodes,'edges':edges}






def getBrowsePathAndAdjacentWebsiteEdgesWithLimit(org,startdate,enddate,limit,userlist=[],trail='*',domain=''):
    return getBrowsePathAndAdjacentEdgesWithLimit(org,startdate,enddate,['website'],limit,userlist,trail,domain)


def getBrowsePathAndAdjacentPhoneEdgesWithLimit(org,startdate,enddate,limit,userlist=[],trail='*',domain=''):
    return getBrowsePathAndAdjacentEdgesWithLimit(org,startdate,enddate,['phone'],limit,userlist,trail,domain)

def getBrowsePathAndAdjacentEmailEdgesWithLimit(org,startdate,enddate,limit,userlist=[],trail='*',domain=''):
    return getBrowsePathAndAdjacentEdgesWithLimit(org,startdate,enddate,['email'],limit,userlist,trail,domain)

def getBrowsePathAndAdjacentEntitiesWithLimit(org,startdate,enddate,limit,userlist=[],trail='*',domain=''):
    entityDataConnector.close()
    org = org.upper()
    command = """SELECT datawake_data.id,unix_timestamp(datawake_data.ts) as ts,datawake_data.url,entity_type,entity_value
                 FROM memex_sotera.datawake_data INNER JOIN general_extractor_web_index ON memex_sotera.datawake_data.url = memex_sotera.general_extractor_web_index.url
                 WHERE datawake_data.org=%s AND domain=%s
                  """
    commandArgs = [org,domain]

    # add the time filter to the query
    # if (startdate == '' and enddate == ''):
    #     pass
    # elif (startdate != '' and enddate == ''):
    #     command = command +" AND unix_timestamp(datawake_data.ts) >= %s "
    #     commandArgs.append(startdate)
    # elif (startdate == '' and enddate != ''):
    #     command = command + "  AND unix_timestamp(datawake_data.ts) <= %s "
    #     commandArgs.append(enddate)
    # else:
    #     command = command + " AND unix_timestamp(datawake_data.ts) >= %s and unix_timestamp(datawake_data.ts) <= %s "
    #     commandArgs.append(startdate)
    #     commandArgs.append(enddate)

    # add the user filter
    if (len(userlist) > 0):
        command = command +" AND "
        params = ['%s' for i in range(len(userlist))]
        params = ','.join(params)
        command = command + "  userId in ("+params+") "
        commandArgs.extend(userlist)

    # add the trail filter
    if trail != '*':
        command = command +" AND "
        command = command + " trail = %s"
        commandArgs.append(trail)

    command = command + " ORDER BY datawake_data.ts asc"

    tangelo.log("SQL COMMAND: " + command)
    tangelo.log("SQL PARAMS : " + str(commandArgs))

    db_rows = datawake_db.dbGetRows(command,commandArgs)

    tangelo.log("SQL RETURNED " + str(len(db_rows)) + " rows")
    browsePath = {}
    entities = []
    for row in db_rows:
        (id,ts,url,entity_type,entity_value) = row
        if trail is None or trail.strip() == '': trail = "default"

        if id not in browsePath:

            ext = tldextract.extract(url)

            browsePath[id] = {'id':id,
                              'url':url,
                              'timestamp':ts,
                              'subdomain':ext.subdomain,
                              'domain':ext.domain,
                              'suffix':ext.suffix

            }


        entity = {
            'id':id,
            'type':entity_type,
            'value':entity_value
        }
        bAdd = True;
        if (entity_type=='email'):
            emailPieces = entity_value.split('@');
            entity['user_name'] = emailPieces[0];
            emailExt = tldextract.extract('mailto://'+emailPieces[1]);
            entity['domain'] = emailExt.domain;
            entity['subdomain'] = emailExt.subdomain;
        elif (entity_type=='phone'):
            if (len(entity_value) < 3):
                bAdd = False
            else:
                entity['area_code'] = entity_value[:3]
        else:
            webExt = tldextract.extract(entity_value)
            entity['subdomain']=webExt.subdomain
            entity['domain']=webExt.domain
            entity['suffix']=webExt.suffix

        if (bAdd):
            entities.append(entity)


    entityDataConnector.close()
    return {
        'browsePath':browsePath,
        'entities':entities
    }

def getBrowsePathWithTextSelections(org,startdate,enddate,userlist=[],trail='*',domain=''):
    # first get the browse path
    graph = getBrowsePathEdges(org,startdate,enddate,userlist,trail,domain)
    nodes = graph['nodes']
    edges = graph['edges']

    newnodes = {}
    try:
        # for each node in the browse path pull any related notes:
        for key,node in nodes.iteritems():
            postIds = node['postIds']
            if len(postIds) > 0:
                params = ','.join(['%s' for i in range(len(postIds))])
                sql =  """
                   SELECT posts.id,  selections.id, unix_timestamp(posts.ts),posts.url,posts.userId,posts.userName,selections.selection
                   FROM datawake_data posts, datawake_selections selections
                   WHERE posts.id = selections.postId and posts.id  in ("""+params+")"

                rows = datawake_db.dbGetRows(sql,postIds)
                for row in rows:
                    postid = row[0]
                    selectionId = row[1]
                    ts = row[2]
                    url = row[3]
                    userId = row[4]
                    userName = row[5].encode()
                    selection = row[6]

                    id = 'selection_'+str(postid)+'_'+str(selectionId)+'_'+'_'+url
                    node = {'id':id,
                            'type':'selection',
                            'size':5,
                            'groupName':'',
                            'timestamps':[ts],
                            'userNames':[userName],
                            'userIds':[userId],
                            'data':selection
                    }
                    newnodes[id] = node
                    edges.append((key,id))

        nodes.update(newnodes)

        if len(userlist) == 1 and trail != '*':
            nodes = addUrlRankstoNodes(org,nodes,userlist[0],trail,domain=domain)


        return {'nodes':nodes,'edges':edges}
    except:
        raise












#
# add the url ranking to a set of nodes, and update the node size
#
def addUrlRankstoNodes(org,nodes,user,trail,domain=''):
    ranks = datawake_db.getUserUrlRanks(org,user,trail,domain=domain)
    for key,node in nodes.iteritems():
        if key in ranks:
            rank = ranks[key]
            node['rank'] = rank
            node['size'] = node['size'] + (2*min(10,rank))
            print 'set rank ',rank,' for key: ',key
        else:
            print 'key not found: ',key
    return nodes


#
# Process a list of edges and nodes into a json graph
#
def processEdges(rawEdges,nodeDict={}):
    nodes = []
    edges = []
    curr_node = 0
    node_map  = {}
    groups = {}
    curr_group = 0


    #process add nodes
    for key,value in nodeDict.iteritems():
        if key not in node_map:
            #type = value['type']
            #if ':' in key:
            #    type = key[:key.index(':')]
            groupName = value['groupName']
            if groupName not in groups:
                groups[groupName] = curr_group
                curr_group +=1
            group = groups[groupName]

        value['group'] = group
        value['index'] = curr_node
        value['community'] = 'n/a'
        value['name'] = value['type']+"-"+value['groupName']+":"+key

        nodes.append(value)
        node_map[key] = curr_node
        curr_node +=1

    # process edges and add extra nodes if found
    for edge in rawEdges:
        value = 1
        if len(edge) > 2: value = edge[2]
        edges.append({"source":node_map[edge[0]],'target':node_map[edge[1]],'value':value})

    graph = {'nodes':nodes, 'links':edges}

    # adding in community detection
    if len(edges) > 0:
        gedges = []
        for e in edges:
            gedges.append((e['source'],e['target']))

        g = igraph.Graph(len(nodes)+1)
        g.add_edges(gedges)
        g.vs['node'] = nodes
        g = g.as_undirected(mode='collapse')
        clustering = g.community_multilevel()

        idx = 0
        for subgraph in clustering.subgraphs():
            for node in subgraph.vs['node']:
                node['community'] = idx
            idx += 1

    return graph





def getBrowsePathWithLookAhead(org,startdate,enddate,userlist=[],trail='*',domain=''):
    entityDataConnector.close()
    browsePathGraph = getBrowsePathEdges(org,startdate,enddate,userlist,trail,domain)
    nodes = browsePathGraph['nodes']
    edges = browsePathGraph['edges']
    urls = browsePathGraph['nodes'].keys()


    # for every url in the browse path get all extracted entities and collect all adjacent urls in a set + url-> link map
    visitedEntities = entityDataConnector.getExtractedEntitiesFromUrls(urls)
    entity_set = set([])
    adj_urls = set([])
    link_map = {}
    for url,resultObj in visitedEntities.iteritems():
        for type,values in resultObj.iteritems():
            for value in values:
                entity_set.add(type+":"+value)
                if 'website' == type:
                    if value not in link_map:
                        link_map[value] = set([url])
                    else:
                        link_map[value].add(url)
                    adj_urls.add(value)


    del visitedEntities

    lookaheadFeatures = entityDataConnector.getExtractedEntitiesFromUrls(adj_urls)

    # add place holders for urls with no extracted data
    for adj_url in adj_urls:
        if adj_url not in lookaheadFeatures:
            lookaheadFeatures[adj_url] = {}

    domainLookaheadFeatures = entityDataConnector.getExtractedDomainEntitiesFromUrls(domain,adj_urls)



    for link,resultObj in lookaheadFeatures.iteritems():
        webdomain = 'n/a'
        if '//' in link:  webdomain =  link.split('/')[2]

        all_matches = []
        for type,values in resultObj.iteritems():
            for value in values:
                if type+':'+value in entity_set:
                    all_matches.append(type+':'+value)

        domain_matches = []
        if link in domainLookaheadFeatures:
            for type,values in domainLookaheadFeatures[link].iteritems():
                for value in values:
                    domain_matches.append(type+':'+value)


        node = {'id':link,
                'type':'lookahead',
                'size':5,
                'groupName':webdomain,
                'entity_matches': all_matches,
                'domain_entity_matches': domain_matches,
                }

        if link not in nodes:
            if link in link_map:
                nodes[link] = node
                for url in link_map[link]:
                    edges.append((url,link))
            else:
                tangelo.log("KeyError. ignoring link: "+link)


    entityDataConnector.close()
    return {'nodes':nodes,'edges':edges}

