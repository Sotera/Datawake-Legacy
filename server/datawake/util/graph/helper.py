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
import tangelo
import time
import datawake.util.dataconnector.factory as factory
from datawake.util.db import datawake_mysql
import tldextract


"""

Provides all the functionality around building graphs for display on the datawake
forensic view.

"""


areaCodes = {'201':True,'202':True,'203':True,'204':True,'205':True,'206':True,'207':True,'208':True,'209':True,'210':True,'212':True,'213':True,'214':True,'215':True,'216':True,'217':True,'218':True,'219':True,'224':True,'225':True,'226':True,'228':True,'229':True,'231':True,'234':True,'236':True,'239':True,'240':True,'242':True,'246':True,'248':True,'249':True,'250':True,'251':True,'252':True,'253':True,'254':True,'256':True,'260':True,'262':True,'264':True,'267':True,'268':True,'269':True,'270':True,'272':True,'276':True,'281':True,'284':True,'289':True,'301':True,'302':True,'303':True,'304':True,'305':True,'306':True,'307':True,'308':True,'309':True,'310':True,'312':True,'313':True,'314':True,'315':True,'316':True,'317':True,'318':True,'319':True,'320':True,'321':True,'323':True,'325':True,'330':True,'331':True,'334':True,'336':True,'337':True,'339':True,'340':True,'343':True,'345':True,'346':True,'347':True,'351':True,'352':True,'360':True,'361':True,'364':True,'365':True,'385':True,'386':True,'401':True,'402':True,'403':True,'404':True,'405':True,'406':True,'407':True,'408':True,'409':True,'410':True,'412':True,'413':True,'414':True,'415':True,'416':True,'417':True,'418':True,'419':True,'423':True,'424':True,'425':True,'430':True,'431':True,'432':True,'434':True,'435':True,'437':True,'438':True,'440':True,'441':True,'442':True,'443':True,'450':True,'458':True,'469':True,'470':True,'473':True,'475':True,'478':True,'479':True,'480':True,'484':True,'501':True,'502':True,'503':True,'504':True,'505':True,'506':True,'507':True,'508':True,'509':True,'510':True,'512':True,'513':True,'514':True,'515':True,'516':True,'517':True,'518':True,'519':True,'520':True,'530':True,'531':True,'534':True,'539':True,'540':True,'541':True,'551':True,'559':True,'561':True,'562':True,'563':True,'567':True,'570':True,'571':True,'573':True,'574':True,'575':True,'579':True,'580':True,'581':True,'585':True,'586':True,'587':True,'601':True,'602':True,'603':True,'604':True,'605':True,'606':True,'607':True,'608':True,'609':True,'610':True,'612':True,'613':True,'614':True,'615':True,'616':True,'617':True,'618':True,'619':True,'620':True,'623':True,'626':True,'630':True,'631':True,'636':True,'639':True,'641':True,'646':True,'647':True,'649':True,'650':True,'651':True,'657':True,'660':True,'661':True,'662':True,'664':True,'667':True,'669':True,'670':True,'671':True,'678':True,'681':True,'682':True,'684':True,'701':True,'702':True,'703':True,'704':True,'705':True,'706':True,'707':True,'708':True,'709':True,'712':True,'713':True,'714':True,'715':True,'716':True,'717':True,'718':True,'719':True,'720':True,'721':True,'724':True,'725':True,'727':True,'731':True,'732':True,'734':True,'740':True,'747':True,'754':True,'757':True,'758':True,'760':True,'762':True,'763':True,'765':True,'767':True,'769':True,'770':True,'772':True,'773':True,'774':True,'775':True,'778':True,'779':True,'780':True,'781':True,'784':True,'785':True,'786':True,'787':True,'800':True,'801':True,'802':True,'803':True,'804':True,'805':True,'806':True,'807':True,'808':True,'809':True,'810':True,'812':True,'813':True,'814':True,'815':True,'816':True,'817':True,'818':True,'819':True,'828':True,'829':True,'830':True,'831':True,'832':True,'843':True,'844':True,'845':True,'847':True,'848':True,'849':True,'850':True,'855':True,'856':True,'857':True,'858':True,'859':True,'860':True,'862':True,'863':True,'864':True,'865':True,'866':True,'867':True,'868':True,'869':True,'870':True,'872':True,'873':True,'876':True,'877':True,'878':True,'888':True,'901':True,'902':True,'903':True,'904':True,'905':True,'906':True,'907':True,'908':True,'909':True,'910':True,'912':True,'913':True,'914':True,'915':True,'916':True,'917':True,'918':True,'919':True,'920':True,'925':True,'928':True,'929':True,'931':True,'936':True,'937':True,'938':True,'939':True,'940':True,'941':True,'947':True,'949':True,'951':True,'952':True,'954':True,'956':True,'959':True,'970':True,'971':True,'972':True,'973':True,'978':True,'979':True,'980':True,'984':True,'985':True,'989':True}
entityDataConnector = factory.get_entity_data_connector()

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
    rows = datawake_mysql.dbGetRows(command,commandArgs)


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
    results = entityDataConnector.get_extracted_entities_with_domain_check(urls,adjTypes,domain=domain)


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
            elif type == 'info':
                group = name.split('->')[0]
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

def getOculusForensicGraph(org,startdate,enddate,userlist=[],trail='*',domain=''):
    startMillis = int(round(time.time() * 1000))
    entityDataConnector.close()
    org = org.upper()
    command = """SELECT t1.id,unix_timestamp(t1.ts) as ts,t1.url,entity_type,entity_value
                 FROM memex_sotera.datawake_data as t1 INNER JOIN general_extractor_web_index as t2 ON t1.url = t2.url
                 WHERE t1.org=%s AND t1.domain=%s
                  """
    commandArgs = [org,domain]

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

    command = command + " ORDER BY t1.ts asc"

    tangelo.log('Executing command : ' + command)
    tangelo.log('Command args : ' + str(commandArgs))
    db_rows = datawake_mysql.dbGetRows(command,commandArgs)

    browsePath = {}
    adj_urls = set([])
    entities = []
    tangelo.log('DB Returned : ' + str(len(db_rows)) + ' rows ')
    for row in db_rows:
        (id,ts,url,entity_type,entity_value) = row

        # tangelo.log('\t'+str(row))

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
            emailPieces = entity_value.split('@')
            entity['user_name'] = emailPieces[0]
            emailURL = 'mailto://'+emailPieces[1]
            emailExt = tldextract.extract(emailURL)
            entity['domain'] = emailExt.domain
            entity['subdomain'] = emailExt.subdomain
        elif (entity_type=='phone'):
            areaCode = ''
            if (len(entity_value) == 10):
                areaCode = entity_value[1:4]

            if (areaCode != ''):
                entity['area_code'] = areaCode
        else:
            adj_urls.add(entity_value)
            webExt = tldextract.extract(entity_value)
            entity['subdomain']=webExt.subdomain
            entity['domain']=webExt.domain
            entity['suffix']=webExt.suffix

        if (bAdd):
            entities.append(entity)

    # Get all the lookahead features
    if (len(adj_urls) > 0):
        lookaheadFeatures = entityDataConnector.get_extracted_entities_from_urls(adj_urls)

        # add place holders for urls with no extracted data
        for adj_url in adj_urls:
            if adj_url not in lookaheadFeatures:
                lookaheadFeatures[adj_url] = {}

        domainLookaheadFeatures = entityDataConnector.get_extracted_domain_entities_from_urls(domain,adj_urls)
    else:
        lookaheadFeatures = []
        domainLookaheadFeatures = []


    entityDataConnector.close()
    endMillis = int(round(time.time() * 1000))
    tangelo.log('Processing time = ' + str((endMillis-startMillis)/1000) + 's');
    return {
        'browsePath':browsePath,
        'entities':entities,
        'lookaheadFeatures':lookaheadFeatures,
        'domainLookaheadFeatures':domainLookaheadFeatures
    }

def getBrowsePathAndAdjacentInfoEdges(org,startdate,enddate,limit,userlist=[],trail='*',domain=''):
    return getBrowsePathAndAdjacentEdgesWithLimit(org,startdate,enddate,['info'],limit,userlist,trail,domain)

    # Get all the lookahead features
    lookaheadFeatures = entityDataConnector.get_extracted_entities_from_urls(adj_urls)

    # add place holders for urls with no extracted data
    for adj_url in adj_urls:
        if adj_url not in lookaheadFeatures:
            lookaheadFeatures[adj_url] = {}

    domainLookaheadFeatures = entityDataConnector.get_extracted_domain_entities_from_urls(domain,adj_urls)


    entityDataConnector.close()
    endMillis = int(round(time.time() * 1000))
    tangelo.log('Processing time = ' + str((endMillis-startMillis)/1000) + 's');
    return {
        'browsePath':browsePath,
        'entities':entities,
        'lookaheadFeatures':lookaheadFeatures,
        'domainLookaheadFeatures':domainLookaheadFeatures
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

                rows = datawake_mysql.dbGetRows(sql,postIds)
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
    ranks = datawake_mysql.getUserUrlRanks(org,user,trail,domain=domain)
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
    #t1 = time.time()
    browsePathGraph = getBrowsePathEdges(org,startdate,enddate,userlist,trail,domain)
    #t2 = time.time()
    #tangelo.log("GOT BROWSE PATH IN "+str(t2-t1))
    nodes = browsePathGraph['nodes']
    edges = browsePathGraph['edges']
    urls = browsePathGraph['nodes'].keys()

    # for every url in the browse path get all extracted entities and collect all adjacent urls in a set + url-> link map
    #t1 = time.time()
    visitedEntities = entityDataConnector.get_extracted_entities_from_urls(urls)
    #t2 = time.time()
    #tangelo.log("GOT ALL VISITED ENTITIES IN "+str(t2-t1))

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

    #t1 = time.time()
    lookaheadFeatures = entityDataConnector.get_extracted_entities_from_urls(adj_urls)
    #t2 = time.time()
    #tangelo.log("GOT ALL LOOKAHEAD ENTITIES IN "+str(t2-t1))

# add place holders for urls with no extracted data
    for adj_url in adj_urls:
        if adj_url not in lookaheadFeatures:
            lookaheadFeatures[adj_url] = {}

    #t1 = time.time()
    domainLookaheadFeatures = entityDataConnector.get_extracted_domain_entities_from_urls(domain,adj_urls)
    #t2 = time.time()
    #tangelo.log("GOT DOMAIN LOOKAHEAD ENTITIES IN "+str(t2-t1))

    #t1 = time.time()

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
                tangelo.log("getBrowsePathWithLookAhead:: KeyError. ignoring link: "+link)

    #t2 = time.time()
    #tangelo.log("PROCESSED GRAPH IN "+str(t2-t1))
    entityDataConnector.close()
    return {'nodes':nodes,'edges':edges}


