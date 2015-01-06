package com.soteradefense.datawake.trails.topology.save.data

import backtype.storm.tuple.Values
import com.soteradefense.datawake.trails.data.StormData

/**
 * Helper object for storing crawler output data.
 * @param org Org the url belongs to
 * @param domain Domain the url belongs to
 * @param trail Trail the url belongs to
 * @param url The actual URL
 * @param html The contents of the url
 * @param title The title parse from the url
 * @param rank The rank of the url.
 */
class DatawakeCrawlerData(org: String, domain: String, trail: String, url: String, html: String, title: String, rank: String)
  extends StormData {
  override def toValues: Values = {
    new Values(org, domain, trail, url, html, title, rank)
  }
}
