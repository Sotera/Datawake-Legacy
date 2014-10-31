import datetime

from impala.dbapi import connect

from datawake.util import datawakeconfig


"""
uses the impyla library:   https://github.com/cloudera/impyla

param binding is not the same as mysqlconnector
ex:   cursor.execute("select * from tablename where foo=%(foo)s and bar = %(bar)s",{'foo':'FOO','bar':'BAR'})

TODO:  we should be able to connect to impala with a simple odbc library vice impyla, which could make it easier to
switch between databases.

"""


def get_cnx():
    return connect(host=datawakeconfig.IMPALA_HOST,port=datawakeconfig.IMPALA_PORT)


#
# Return all rows from a select query
#
def dbGetRows(sql,params):
    cnx = get_cnx()
    cursor = cnx.cursor()
    try:
        cursor.execute(sql,params)
        return cursor.fetchall()
    finally:
        cnx.close()



### LOOKAHEAD

def getLookaheadEntities(url):
    sql = "select distinct extract_type, extract_value from dp_datawake_hbase where url = %(url)s"
    params = {'url':url}
    rows = dbGetRows(sql,params)
    results = {}
    for row in rows:
        (type,value) = row
        if type not in results:
            results[type] = set([])
        results[type].add(value)
    return results


#
# Return the (timestamp,elapsed seconds) for the most recent lookup entry
# returns None if no entry found.
#
def getLastLookaheadTimestamp(url):
    sql = "select max(dt) from dp_datawake_hbase where url = %(url)s"
    params = {'url':url}
    rows = dbGetRows(sql,params)
    if len(rows) < 1 or rows[0][0] is None: return None
    else:
        ts =  int(rows[0][0])
        now = int(datetime.datetime.utcnow().strftime("%s"))
        return (ts,now-ts)


#
#
def getLookaheadMatches(values):
    sql = ""
    params = {}
    max = len(values) - 1
    for i in range(len(values)):
        paramname = 'url'+str(i)
        params[paramname] = values[i]
        sql = sql+ "select rowkey from hbase_idx_memexht_urn where rowkey = %("+paramname+")s "
        if i < max:
            sql = sql +" union all "
    #print sql,params
    rows = dbGetRows(sql,params)
    return map(lambda x: x[0],rows)



def getEntityMatches(cursor,values):
    sql = ""
    params = {}
    max = len(values) - 1
    for i in range(len(values)):
        paramname = 'url'+str(i)
        params[paramname] = values[i]
        sql = sql+ "select rowkey from hbase_idx_memexht_urn where rowkey = %("+paramname+")s "
        if i < max:
            sql = sql +" union all "
    #print sql,params
    cursor.execute(sql,params)
    rows = cursor.fetchall()
    return map(lambda x: x[0],rows)
