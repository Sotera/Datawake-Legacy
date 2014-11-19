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

import sys

import mysql.connector
from mysql.connector import errorcode
import tangelo

from datawake.conf import datawakeconfig as dbconfig


"""

Interface to datawake relational database tables (mysql)

"""


#
# Define each datawake_table
#
TABLES = {}

TABLES['datawake_org'] = """
    CREATE TABLE datawake_org (
      email VARCHAR(300),
      org VARCHAR(300)
    )
"""

TABLES['datawake_domains'] = """
    CREATE TABLE datawake_domains (
      name VARCHAR(300),
      description TEXT,
      PRIMARY KEY(name)
    )
"""

TABLES['datawake_selections'] = """
  CREATE TABLE datawake_selections (
  id INT NOT NULL AUTO_INCREMENT,
  postId INT NOT NULL,
  selection TEXT,
  PRIMARY KEY(id),
  FOREIGN KEY(postId) REFERENCES datawake_data(id) ON DELETE CASCADE
  )

"""

TABLES['datawake_data'] = """
    CREATE TABLE datawake_data (
      id INT NOT NULL AUTO_INCREMENT,
      ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      url TEXT,
      userId TEXT,
      userName TEXT,
      trail VARCHAR(100),
      org VARCHAR(300),
      domain VARCHAR(300),
      PRIMARY KEY(id),
      INDEX(url(30))
    )

"""
TABLES['datawake_trails'] = """
    CREATE TABLE datawake_trails (
      name VARCHAR(100) NOT NULL,
      created TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by TEXT,
      description TEXT,
      org VARCHAR(300),
      domain VARCHAR(300),
      PRIMARY KEY(name,org,domain)
    )

"""

TABLES['starred_features'] = """
    CREATE TABLE starred_features (
      org VARCHAR(300),
      trail VARCHAR(100) NOT NULL,
      type VARCHAR(100),
      value VARCHAR(1024),
      INDEX(org,trail)
    )
"""

TABLES['datawake_url_rank'] = """
   CREATE TABLE datawake_url_rank (
    id INT NOT NULL AUTO_INCREMENT,
    url TEXT,
    userId TEXT,
    trailname VARCHAR(100),
    rank INT,
    org VARCHAR(300),
    domain VARCHAR(300),
    PRIMARY KEY(id),
	INDEX(url(30),userId(20),trailname)
)
"""

TABLES['datawake_domain_entities'] = """
    CREATE TABLE datawake_domain_entities (
      rowkey varchar(1024),
      INDEX(rowkey(300))
    )

"""

TABLES['general_extractor_web_index'] = """
    CREATE TABLE general_extractor_web_index (
      url varchar(1024),
      entity_type varchar(100),
      entity_value varchar(1024),
      ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      index(url(300))
    )
"""

TABLES['domain_extractor_web_index'] = """
  CREATE TABLE domain_extractor_web_index (
      domain VARCHAR(300),
      url varchar(1024),
      entity_type varchar(100),
      entity_value varchar(1024),
      ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      index(domain(300),url(300))
    )
"""

TABLES['domain_extractor_runtimes'] = """
  CREATE TABLE domain_extractor_runtimes (
      domain VARCHAR(300),
      url varchar(1024),
      entity_type varchar(100),
       ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      index(domain(300),url(300))
    )
"""

#

# ##  GENERIC DB FUNCTIONS ###


#
# Returns a connection to the datawake database
#
def get_cnx():
    user = dbconfig.DATAWAKE_CORE_DB['user']
    db = dbconfig.DATAWAKE_CORE_DB['database']
    pw = dbconfig.DATAWAKE_CORE_DB['password']
    host = dbconfig.DATAWAKE_CORE_DB['host']
    port = dbconfig.DATAWAKE_CORE_DB['port']
    return mysql.connector.connect(user=user, password=pw, host=host, database=db, port=port)


#
# Executes a sql statement and commits it.
# returns the cursor last row id, which may be null
#
def dbCommitSQL(sql, params):
    cnx = get_cnx()
    cursor = cnx.cursor()
    try:
        cursor.execute(sql, params)
        cnx.commit()
        return cursor.lastrowid
    finally:
        cnx.close()
        cursor.close()


#
# Return all rows from a select query
#
def dbGetRows(sql, params):
    cnx = get_cnx()
    cursor = cnx.cursor()
    try:
        cursor.execute(sql, params)
        return cursor.fetchall()
    finally:
        cnx.close()
        cursor.close()


# ###   BROWSE PATH SCRAPE  ###


#
# Add a post to the posts table (datawake_data)
#
def addBrowsePathData(org, url, userId, userName, trail=None, domain='default'):
    org = org.upper()
    sql = " INSERT INTO datawake_data (url,userId,userName,trail,org,domain) VALUES (%s,%s,%s,%s,%s,%s) "
    params = [url, userId, userName, trail, org, domain]
    lastId = dbCommitSQL(sql, params)
    return lastId


def get_post_id(url):
    sql = "select id from datawake_data where url=%s limit 1;"
    params = [url]
    rows = dbGetRows(sql, params)
    if len(rows) == 0:
        return -1
    return rows[0][0]


#
# Get a post from the posts table (datwake_data)
#

def getBrowsePathData(org, id, domain='default'):
    org = org.upper()
    sql = "SELECT id,ts,url,trail,org FROM datawake_data where org = %s AND id = %s AND domain = %s"
    params = [org, id, domain]
    row = dbGetRows(sql, params)[0]
    return {
        'id': row[0],
        'ts': row[1],
        'url': row[2].encode(),
        'trail': row[3],
        'org': row[4]
    }


#
# Get all time stamps from the selected trail,users,org
#  returns a dictionary of the form  {'min':0,'max':0,'data':[]}
#
def getTimeWindow(org, users, trail='*', domain='default'):
    sql = 'SELECT unix_timestamp(ts) as ts from datawake_data WHERE org = %s AND domain = %s '
    params = [org.upper(), domain]

    # add where clause for trail and users
    if trail != '*':
        sql = sql + ' AND trail = %s '
        params.append(trail)
    if len(users) > 0:
        param_string = ','.join(['%s' for i in range(len(users))])
        sql = sql + ' AND userName in (' + param_string + ') '
        params.extend(users)

    sql = sql + ' order by ts asc'
    rows = dbGetRows(sql, params)
    data = map(lambda x: x[0], rows)
    if len(data) == 0:
        return {'min': 0, 'max': 0, 'data': []}
    else:
        return {'min': data[0], 'max': data[-1], 'data': data}


#
# Return a list of hourly counts in the form {ts:_,count:_}
#
def getHourlyBrowsePathCounts(org, users, trail, domain='default'):
    sql = 'SELECT (unix_timestamp(ts) DIV 3600)*3600  as group_hour, count(1) from datawake_data where org = %s AND domain = %s '
    params = [org.upper(), domain]
    if trail != '*' and trail != '':
        sql = sql + ' AND trail = %s '
        params.append(trail)
    if len(users) > 0:
        param_string = ','.join(['%s' for i in range(len(users))])
        sql = sql + ' AND userId in (' + param_string + ') '
        params.extend(users)
    sql = sql + " GROUP BY group_hour"

    tangelo.log(sql)
    tangelo.log(str(params))
    rows = dbGetRows(sql, params)
    result = []
    delta = 3600
    if len(rows) > 0: curr = rows[0][0]
    for row in rows:
        if row[0] is None: continue
        print 'row ', row
        dt = row[0]
        while (dt - curr > 3600):
            curr = curr + delta
            result.append({'ts': curr, 'count': 0})
        result.append({'ts': dt, 'count': row[1]})
        curr = dt

    # add one hour
    if len(result) > 0:
        curr = curr + 3600
        result.append({'ts': curr, 'count': 0})

    return result


#
# Delete all user activity for a selected user within a time frame and org
#
def deleteUserData(org, user, startdate, enddate, domain='default'):
    sql = """DELETE from datawake_data
              where org = %s AND
              domain = %s AND
              userName = %s AND
              unix_timestamp(ts) >=%s AND
              unix_timestamp(ts) <= %s
           """
    params = [org.upper(), domain, user, startdate, enddate]
    return dbCommitSQL(sql, params)


#
# Associate a text selection with a post Id
# by adding it to the selections table
#
def addSelection(postId, selection):
    sql = " INSERT INTO datawake_selections (postId,selection) VALUES (%s,%s) "
    return dbCommitSQL(sql, [postId, selection])


def getSelections(domain, trail, url, org):
    sql = """SELECT datawake_selections.selection
              FROM datawake_selections
              INNER JOIN datawake_data
              ON datawake_selections.postId=datawake_data.id
              WHERE datawake_data.url = %s
              AND datawake_data.domain = %s
              AND datawake_data.trail = %s
              AND datawake_data.org = %s"""
    params = [url, domain, trail, org]
    rows = dbGetRows(sql, params)
    return map(lambda x: x[0], rows)


# ##  ORGANIZATIONS  ###


#
# Add a link from email address to org
#
def addOrgLink(emailAddress, orgName):
    emailAddress = emailAddress.lower()
    orgName = orgName.upper()
    sql = "INSERT INTO datawake_org (email,org) VALUES (%s,%s)"
    params = [emailAddress, orgName]
    return dbCommitSQL(sql, params)


#
# Delete a link from email address to org
#
def deleteOrgLink(emailAddress, orgName):
    emailAddress = emailAddress.lower()
    orgName = orgName.upper()
    sql = "DELETE FROM datawake_org WHERE email = %s AND org = %s"
    params = [emailAddress, orgName]
    return dbCommitSQL(sql, params)


#
# Return a list or orgs linked to an email
#
def getOrgLinks(emailAddress):
    sql = "SELECT org from datawake_org where email = %s"
    params = [emailAddress.lower()]
    rows = dbGetRows(sql, params)
    return map(lambda x: x[0], rows)


#
# Return users within an org who have been active on at least one trail
# returns a list of dicts, {name:_, id:_}
#
def getActiveUsers(org):
    sql = """select distinct(userId), username from datawake_data where org = %s """
    rows = dbGetRows(sql, [org.upper()])
    result = map(lambda x: {'name': x[1].encode(), 'id': x[0]}, rows)
    return result


### TRAILS ###


#
# Ad a new trail to the trails table
#
def addTrail(org, name, description, userId, domain='default'):
    org = org.upper()
    sql = "INSERT INTO datawake_trails (name,description,created_by,org,domain) values (%s,%s,%s,%s,%s)"
    return dbCommitSQL(sql, [name, description, userId, org, domain])


#
# Get a list of all trails name and description
#
def listTrails(org, domain='default'):
    org = org.upper()
    sql = "select name,description,unix_timestamp(created) from datawake_trails where org = %s AND domain = %s ORDER BY created DESC"
    rows = dbGetRows(sql, [org, domain])
    return map(lambda x: {'name': x[0], 'description': x[1], 'created': x[2]}, rows)


#
# Return a list of trail names found in the datawake_data table
#
def get_active_trail_names(org, domain='default'):
    sql = "Select distinct(trail) from datawake_data where org = %s AND domain = %s "
    params = [org.upper(), domain]
    trails = dbGetRows(sql, params)
    trails = map(lambda x: x[0], trails)
    trails = filter(lambda x: x is not None and x != '', trails)
    return trails


#
# Return a mapping of org name to list of active trails
#
def get_all_active_trails(domain='default'):
    sql = "select distinct trail,org from datawake_data where domain = %s "
    rows = dbGetRows(sql, [domain])
    org_trails = {}
    for row in rows:
        (trail, org) = row
        if org not in org_trails:
            org_trails[org] = []
        org_trails[org].append(trail)
    return org_trails


#
# Return list of trails within an org  with counts of user and sze of trail
#
def getTrailsWithUserCounts(org):
    org = org.upper()
    sql = """
        select domain,trail, count(distinct(userId)) as users, count(distinct(id)) as records
        from datawake_data
        where trail is not NULL AND org = %s
        group by domain,trail
       """
    rows = dbGetRows(sql, [org])
    return map(lambda x: {'domain': x[0], 'trail': x[1], 'userCount': x[2], 'records': x[3]}, rows)


#
# Star a feature for a given trail
#
def starFeatureForTrail(org, trail, type, value):
    sql = "INSERT INTO starred_features (org,trail,type,value) VALUES(%s,%s,%s,%s)"
    params = [org, trail, type, value]
    dbCommitSQL(sql, params)


#
# un star a feature for a given trail
#
def unStarFeatureForTrail(org, trail, type, value):
    sql = "DELETE FROM starred_features WHERE org = %s and trail = %s and type = %s and value = %s"
    params = [org, trail, type, value]
    dbCommitSQL(sql, params)


#
# Return list of starred features for a trail
#
def getStarredFeaturesForTrail(org, trail):
    sql = "SELECT type,value FROM starred_features WHERE trail = %s and org = %s"
    params = [trail, org]
    rows = dbGetRows(sql, params)
    tangelo.log(sql)
    tangelo.log(str(params))
    if len(rows) == 0:
        return []
    else:
        return map(lambda x: {'type': x[0], 'value': x[1]}, rows)


####   URL RANKS   ####


#
# Rank a url
#
def rankUrl(org, userId, trailname, url, rank, domain='default'):
    org = org.upper()
    sql = """SELECT id
            FROM datawake_url_rank
            WHERE org = %s AND
            domain = %s AND
            userId = %s AND
            trailname = %s AND
            url = %s"""
    params = [org, domain, userId, trailname, url]
    rows = dbGetRows(sql, params)

    # update existing row
    if len(rows) > 0:
        id = rows[0][0]
        sql = """UPDATE datawake_url_rank
                 SET rank = %s
                 WHERE id = %s
               """
        dbCommitSQL(sql, [rank, id])

    # insert a new row
    else:
        sql = """ INSERT INTO datawake_url_rank (userId,trailname,url,rank,org,domain)
                  VALUES (%s,%s,%s,%s,%s,%s)
              """
        params = [userId, trailname, url, rank, org, domain]
        dbCommitSQL(sql, params)


#
# Get url rank for a user and trail
# Always returns a rank, defaults to 0
#
def getUrlRank(org, userId, trailname, url, domain='default'):
    org = org.upper()
    sql = """ SELECT rank
              FROM datawake_url_rank
              WHERE org = %s AND domain = %s AND userId = %s AND trailname = %s AND url = %s
          """
    params = [org, domain, userId, trailname, url]
    rows = dbGetRows(sql, params)
    if len(rows) == 0:
        return 0
    else:
        return rows[0][0]


#
# return a dict of url->rank for a single user within a trail and org
#
def getUserUrlRanks(org, userId, trail, domain='default'):
    sql = "SELECT url,rank from datawake_url_rank where org = %s AND domain =%s AND userId = %s AND trailname= %s"
    params = [org.upper(), domain, userId, trail]
    rows = dbGetRows(sql, params)
    ranks = {}
    for row in rows:
        ranks[row[0]] = row[1]
    return ranks


####  URL Counts ####


#
# Get the number of times a url has been recorded
# by the data wake
#
def getUrlCount(org, url, domain='default'):
    org = org.upper()
    sql = "SELECT count(1) from datawake_data where url = %s AND org = %s AND domain = %s "
    params = [url, org, domain]
    rows = dbGetRows(sql, params)
    if len(rows) == 0:
        return 0
    else:
        return rows[0][0]


#### Datawake Domains ####



def get_domains(domain=''):
    sql = "SELECT name,description from datawake_domains"
    params = []
    if domain != '':
        sql = sql + " where domain = %s"
        params.append(domain)
    rows = dbGetRows(sql, params)
    return rows


def add_new_domain(domain, description):
    sql = "INSERT INTO datawake_domains (name,description) values (%s,%s) ON DUPLICATE KEY UPDATE description = %s"
    params = [domain, description, description]
    dbCommitSQL(sql, params)


def remove_domain(domain):
    sql = "DELETE FROM datawake_domains WHERE name = %s"
    params = [domain]
    dbCommitSQL(sql, params)


def domain_exists(name):
    sql = "select count(*) from datawake_domains where name=%s"
    result = dbGetRows(sql, [name])
    rows = map(lambda x: x[0], result)
    return rows[0] == 1


#TODO: May Need to Add org
def add_trail_based_entity(domain, trail, entity):
    sql = "insert into trail_based_entities(domain, trail, entity) value (%s,%s,%s)"
    return dbCommitSQL(sql, [domain, trail, entity])


def get_trail_based_entities(domain, trail):
    sql = "select entity from trail_based_entities where domain=%s and trail=%s"
    params = [domain, trail]
    return map(lambda x: x[0], dbGetRows(sql, params))

def get_trail_entity_links(org, domain, trail):
    sql = "select url, title, rank from trail_term_rank where org=%s and domain=%s and trail=%s order by rank desc"
    params = [org, domain, trail]
    return map(lambda x: dict(url=x[0], title=x[1], rank=x[2]), dbGetRows(sql, params))


def add_extractor_feedback(domain, raw_text, entity_type, entity_value, url):
    sql = "insert into scraping_feedback(domain, raw_text, entity_type, entity_value, url) value (%s,%s,%s,%s,%s)"
    return dbCommitSQL(sql, [domain, raw_text, entity_type, entity_value, url])


def get_feedback_entities(domain, url):
    sql = "select entity_type, entity_value from scraping_feedback where url=%s and domain=%s"
    params = [url, domain]
    rows = dbGetRows(sql, params)
    return map(lambda x: dict(type=x[0], value=x[1]), rows)


def get_invalid_extracted_entity_count(user_name, entity_type, entity_value, domain):
    sql = "select count(*) from invalid_extracted_entity where userName=%s and entity_type=%s and entity_value=%s and domain=%s"
    params = [user_name, entity_type, entity_value, domain]
    return dbGetRows(sql, params)[0][0]


def mark_invalid_extracted_entity(user_name, entity_type, entity_value, domain):
    count = get_invalid_extracted_entity_count(user_name, entity_type, entity_value, domain)
    if count == 0:
        params = [user_name, entity_type, entity_value, domain]
        sql = "insert into invalid_extracted_entity(userName, entity_type, entity_value, domain) value (%s,%s,%s,%s)"
        return dbCommitSQL(sql, params)
    else:
        return -1


#### OLD STUFF, needs cleaned and updated ####



#
# Drop and re-create all tables
#
def drop_and_create_tables():
    cnx = get_cnx()
    cursor = cnx.cursor()
    try:
        for name in [
            'datawake_domain_entities',
            'datawake_domains',
            'datawake_org',
            'datawake_url_rank',
            'datawake_trails',
            'datawake_selections',
            'datawake_data',
            'starred_features',
            'general_extractor_web_index',
            'domain_extractor_web_index',
            'domain_extractor_runtimes'
        ]:
            print 'DROP TABLE ', name
            cursor.execute('DROP TABLE IF EXISTS `' + name + '`')
        for name in [
            'datawake_domain_entities',
            'datawake_domains',
            'datawake_org', 'datawake_data',
            'datawake_url_rank',
            'datawake_trails',
            'datawake_selections',
            'starred_features',
            'general_extractor_web_index',
            'domain_extractor_web_index',
            'domain_extractor_runtimes'
        ]:
            ddl = TABLES[name]
            print("Creating table {}: ".format(name))
            cursor.execute(ddl)
    finally:
        cursor.close()
        cnx.close()


#
#  Main function allows to run as a script to drop and create tables.
#
if __name__ == '__main__':
    if sys.argv[1] == 'create-db':
        drop_and_create_tables()
    else:
        print 'usage: python ' + sys.argv[0] + ' create-db (will drop and recreate db)'
