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
;;(defn kafka-bolt [topic]
;;    (let [selector (new DefaultTopicSelector topic)
;;        mapper (FieldNameBasedTupleToKafkaMapper.)
;;         bolt (KafkaBolt.)
;;        selected-bolt (.withKafkaTopicSelector bolt selector)
;;        mapped-bolt (.withTupleToKafkaMapper selected mapper)]
;;    mapped-bolt))



(def incoming-dw-visited-spout
    (kafka-spout "memex-datawake-visited" "memex-datawake-visited-consumer"))

;;(def outgoing-dw-lookahead-urls-bolt
 ;;   (new KafkaBolt))





;; ===================
;; Topology Definition
;; ===================



(defn kafka-topo [options]
[
     ;;spout configuration
    {
    "incoming-dw-visited-spout" (spout-spec
    incoming-dw-visited-spout
        :p 1)
    }

    {
     ;; The kafka-bolt parses incoming tuples from the JVM Spout.
     ;; It then dispatches them to Storm streams.
     ;; The name of each stream is equal to the Kafka topic name.
     ;; A 'default' stream will forward raw messages that could
     ;; not dispatch successfully. Non-JSON messages will also
     ;; be fail()'ed automatically.
    "kafka-bolt" (python-bolt-spec
          options
          ;; input
          { "incoming-dw-visited-spout" :shuffle }

          ;; Python class
          "bolts.dwvisited.datawake_visited_kafka_bolt.DatawakeVisitedKafkaBolt"
           ["url", "status", "headers", "flags", "body", "timestamp", "source","context"]
          ;; parallelism
          :p 1
      )


    "website-bolt" (python-bolt-spec
               options
               {"kafka-bolt" :shuffle }
               "bolts.extractors.website_bolt.WebsiteBolt"
                ["attribute", "value", "extracted_raw", "extracted_metadata","context"]


               )

    "crawler-bolt" ( python-bolt-spec
               options
               { "website-bolt" ["value"] }
               "bolts.crawler_bolt.CrawlerBolt"
               ["url", "status", "headers", "flags", "body", "timestamp", "source","context"]
               )

    "email-bolt" (python-bolt-spec
             options
             {"kafka-bolt" :shuffle }
             "bolts.extractors.email_bolt.EmailBolt"
             ["attribute", "value", "extracted_raw", "extracted_metadata","context"]

             )

    "phone-bolt" (python-bolt-spec
             options
             {"kafka-bolt" :shuffle }
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
              :p 2
              )

    ;;"lookahead-kafka-writer-bolt" (bolt-spec
     ;;                             {"website-bolt" :shuffle }
      ;;                            outgoing-dw-lookahead-urls-bolt
       ;;                           :p 1
        ;;                          )


}
]
)