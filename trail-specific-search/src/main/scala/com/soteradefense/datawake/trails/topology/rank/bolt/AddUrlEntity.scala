package com.soteradefense.datawake.trails.topology.rank.bolt

import java.sql.{ResultSet, PreparedStatement}

import backtype.storm.topology.BasicOutputCollector
import backtype.storm.tuple.Tuple
import com.soteradefense.datawake.trails.bolts.SqlUpdateBolt
import com.soteradefense.datawake.trails.sql.SqlCredentials

class AddUrlEntity(credentials: SqlCredentials, selectSql: String, insertSql: String) extends SqlUpdateBolt(credentials) {
  override def execute(input: Tuple, collector: BasicOutputCollector): Unit = {
    val org = input.getStringByField("eOrg")
    val domain = input.getStringByField("eDomain")
    val trail = input.getStringByField("eTrail")
    val url = input.getStringByField("eUrl")
    val entity = input.getStringByField("eEntity")
    val relevant = input.getIntegerByField("eRelevant")
    var selectPrepared: PreparedStatement = null
    var insertPrepared: PreparedStatement = null
    try{
      selectPrepared = this.connection.prepareStatement(selectSql)
      selectPrepared.setString(1, org)
      selectPrepared.setString(2, domain)
      selectPrepared.setString(3, trail)
      selectPrepared.setString(4, entity)
      selectPrepared.setString(5, url)
      selectPrepared.setInt(6, relevant)
      val exists: ResultSet = selectPrepared.executeQuery()
      if(exists.next()){
        val count: Int = exists.getInt("count")
        if(count == 0){
          insertPrepared = this.connection.prepareStatement(insertSql)
          insertPrepared.setString(1, org)
          insertPrepared.setString(2, domain)
          insertPrepared.setString(3, trail)
          insertPrepared.setString(4, entity)
          insertPrepared.setString(5, url)
          insertPrepared.setInt(6, relevant)
          insertPrepared.executeUpdate()
        }
      }

    } finally{
      if(selectPrepared != null)
        selectPrepared.close()
      if(insertPrepared != null)
        insertPrepared.close()

    }
  }
}
