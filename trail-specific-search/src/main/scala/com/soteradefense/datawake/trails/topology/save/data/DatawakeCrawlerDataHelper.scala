package com.soteradefense.datawake.trails.topology.save.data

/**
 * Helper class for parsing
 * @param appid Appid associated with the crawl
 * @param url Url crawled
 * @param body body of the url
 * @param attrs Passed along attributes with the crawl request.
 */
case class DatawakeCrawlerDataHelper(appid: String, url: String, body: String, attrs: DatawakeDomainTriplet)
