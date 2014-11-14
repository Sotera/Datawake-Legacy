package com.soteradefense.datawake.trails.sql

import java.sql.{Connection, PreparedStatement}

class SQLExecutor(conn: Connection) {
  def updateCount(sql: String, count: Double, org: String, domain: String, trail: String, link: String): Int = {

    var sqlPrepare: PreparedStatement = null
    try {
      sqlPrepare = this.conn.prepareStatement(sql)
      sqlPrepare.setDouble(1, count)
      sqlPrepare.setString(2, org)
      sqlPrepare.setString(3, domain)
      sqlPrepare.setString(4, trail)
      sqlPrepare.setString(5, link)
      sqlPrepare.executeUpdate()
    } finally {
      if (sqlPrepare != null)
        sqlPrepare.close()
    }
  }

  def insertCount(sql: String, count: Double, org: String, domain: String, trail: String, link: String, title: String, rank: String): Int = {
    var sqlPrepare: PreparedStatement = null
    try {
      sqlPrepare = this.conn.prepareStatement(sql)
      sqlPrepare.setString(1, org)
      sqlPrepare.setString(2, domain)
      sqlPrepare.setString(3, trail)
      sqlPrepare.setString(4, link)
      sqlPrepare.setString(5, title)
      sqlPrepare.setDouble(6, count)
      sqlPrepare.setInt(7, rank.toInt)
      sqlPrepare.executeUpdate()
    } finally {
      if (sqlPrepare != null)
        sqlPrepare.close()
    }
  }

  def getCount(sql: String, org: String, domain: String, trail: String, link: String, title: String) = {
    var selectPrepare: PreparedStatement = null
    try {
      selectPrepare = this.conn.prepareStatement(sql)
      selectPrepare.setString(1, org)
      selectPrepare.setString(2, domain)
      selectPrepare.setString(3, trail)
      selectPrepare.setString(4, link)
      selectPrepare.setString(5, title)
      val rs = selectPrepare.executeQuery()
      if (rs.next())
        rs.getDouble("rank")
      else
        -1.0
    } finally {
      if (selectPrepare != null)
        selectPrepare.close()
    }
  }
}
