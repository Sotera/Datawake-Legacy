package com.soteradefense.datawake.trails.sql

/**
 * Case class that defines basic jdbc credentials
 * @param jdbc jdbc string
 * @param username username to use
 * @param password password to use
 */
case class SqlCredentials(jdbc: String, username: String, password: String)
