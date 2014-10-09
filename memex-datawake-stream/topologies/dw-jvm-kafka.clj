(ns kafka-topo
    (:use [backtype.storm.clojure]
        [streamparse.specs])
    (:import [storm.kafka SpoutConfig
         KafkaSpout
         StringScheme
         ZkHosts]
;;    [storm.kafka.bolt.selector DefaultTopicSelector ]
;;    [storm.kafka.bolt.mapper FieldNameBasedTupleToKafkaMapper]
    [storm.kafka.bolt KafkaBolt]
    [backtype.storm.spout SchemeAsMultiScheme])
    (:gen-class)
)


(def zk (ZkHosts. "localhost:2181"))
(def zkroot "/storm")

;; Java Interop code that creates a JVM KafkaSpout
(defn kafka-spout [topic consumer]
    (let [config (SpoutConfig. zk topic zkroot consumer)]
        (set! (.scheme config) (SchemeAsMultiScheme. (StringScheme.)))
        (KafkaSpout. config)))

;; Java Interop code that creates a JVM KafkaBolt
;;(defn dw-visited-incoming [topic]
;;    (let [selector (new DefaultTopicSelector topic)
;;        mapper (FieldNameBasedTupleToKafkaMapper.)
;;         bolt (KafkaBolt.)
;;        selected-bolt (.withKafkaTopicSelector bolt selector)
;;        mapped-bolt (.withTupleToKafkaMapper selected mapper)]
;;    mapped-bolt))



(def incoming-dw-visited-spout
    (kafka-spout "memex-datawake-visited" "memex-datawake-visited-consumer"))


(def crawler-in-spout
    (kafka-spout "crawler-in" "crawler-in"))


(def crawler-out-spout
    (kafka-spout "crawler-out" "crawler-out"))

;;(def outgoing-dw-lookahead-urls-bolt
 ;;   (new KafkaBolt))





;; ===================
;; Topology Definition
;; ===================



(defn kafka-topo [options]
[

     ;;spout configuration
    {

    ;; DATAWAKE VISITED
    ;; listen for pages visted by the datawake
    "incoming-dw-visited-spout" (spout-spec
        incoming-dw-visited-spout
        :p 1)


    ;; CRAWLER IN
    ;; listen for urls sent to be crawled
    "incoming-crawler-spout" (spout-spec
        crawler-in-spout
        :p 1)


    ;; CRALWER OUT / DATAWAKE LOOKAHEAD
    ;; listen for pages that have been crawled
    "outgoing-crawler-spout" (spout-sepc
        crawler-out-spout
        :p 1)

    }


    ;; bolt configuration
    {

    ;; DATAWAKE VISITED

    ;; parse and dispatch messages from the datawake visited queue
    "dw-visited-incoming" (python-bolt-spec
          options
          ;; input
          { "incoming-dw-visited-spout" :shuffle }
          ;; Python class
          "bolts.dwvisited.datawake_visited_kafka_bolt.DatawakeVisitedKafkaBolt"
           ;; output
           ["url", "status", "headers", "flags", "body", "timestamp", "source","context"]
          ;; parallelism
          :p 1
      )

    "website-bolt" (python-bolt-spec
               options
               {"dw-visited-incoming" :shuffle }
               "bolts.extractors.website_bolt.WebsiteBolt"
                ["attribute", "value", "extracted_raw", "extracted_metadata","context"]
               )

    "email-bolt" (python-bolt-spec
             options
             {"dw-visited-incoming" :shuffle }
             "bolts.extractors.email_bolt.EmailBolt"
             ["attribute", "value", "extracted_raw", "extracted_metadata","context"]
             )

    "phone-bolt" (python-bolt-spec
             options
             {"dw-visited-incoming" :shuffle }
             "bolts.extractors.phone_bolt.PhoneBolt"
             ["attribute", "value", "extracted_raw", "extracted_metadata","context"]
             )


    "writer-bolt" (python-bolt-spec
              options
              {"email-bolt" :shuffle
              "phone-bolt" :shuffle
              "website-bolt" :shuffle }
              "bolts.dwvisited.datawake_visited_writer_bolt.DatawakeVisitedWriterBolt"
              []
              )

     ;;  END DATAWAKE VISITED



    ;; CRAWLER-IN
    ;; local stand in for crawling infrastructure
    "crawler-bolt" ( python-bolt-spec
             options
             { "incoming-crawler-spout" :shuffle }
             "bolts.crawler_bolt.CrawlerBolt"
             ["url", "status", "headers", "flags", "body", "timestamp", "source","context"]
             :p 1
             )

    ;; END CRALWER -IN



    ;; CRAWLER-OUT / DATAWAKE LOOKAHEAD

    ;; note - almost a duplicate of dw-visited, but is seperated
    ;; to keep visted latency down




    ;; END CRAWLER-OUT / DATAWAKE LOOKAHEAD


}
]
)