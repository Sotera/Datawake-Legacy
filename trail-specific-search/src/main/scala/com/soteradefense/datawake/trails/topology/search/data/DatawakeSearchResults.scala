package com.soteradefense.datawake.trails.topology.search.data

import scala.collection.mutable

/**
 * Helper object for defining the Google Result
 * @param results List of Internet Results
 * @param estimatedResultCount Estimated result count
 */
case class DatawakeSearchResults (results: mutable.HashSet[DatawakeInternetResult], estimatedResultCount: String)
