package com.soteradefense.datawake.trails.topology.search.data

import backtype.storm.tuple.Values
import com.soteradefense.datawake.trails.data.StormData

/**
 * Helper Class for parsing a new Datawake term
 * @param org The org it belongs to
 * @param domain The domain it belongs to
 * @param trail The trail it belongs to
 * @param term The search term.
 * @param isRelevant Relevant or Irrelevant?
 */
class DatawakeTerm(org: String, domain: String, trail: String, term: String, isRelevant: Boolean) extends StormData {
  override def toValues: Values = {
    new Values(org, domain, trail, term, isRelevant.asInstanceOf[java.lang.Boolean])
  }

}