(ns datawake-topo
    (:use [backtype.storm.clojure]
        [streamparse.specs])
    (:import [storm.kafka SpoutConfig
         KafkaSpout
         StringScheme
         ZkHosts]
        [backtype.storm.spout SchemeAsMultiScheme])
    (:gen-class)
)

;; Read ZK hosts and root from the env  ZK_HOSTS="host:port,..."
(def zk (ZkHosts.  (System/getenv "ZK_HOSTS")))
(assert zk "env ZK_HOSTS must be set")
(def zkroot (or (System/getenv "ZK_ROOT") "" ) )


;; Read in the kafka topics from the environment
(def visited-topic (or (System/getenv "DW_VISITED_TOPIC") "datawake-visited" ) )
(def crawler-in-topic (or (System/getenv "DW_CRAWLER_IN_TOPIC") "crawler-in" ) )
(def crawler-out-topic (or (System/getenv "DW_CRAWLER_OUT_TOPIC") "crawler-out" ) )


;; Java Interop code that creates a JVM KafkaSpout
(defn kafka-spout [topic consumer]
    (let [config (SpoutConfig. zk topic zkroot consumer)]
    (set! (.scheme config) (SchemeAsMultiScheme. (StringScheme.)))
    (KafkaSpout. config)))



(def incoming-dw-visited-spout
(kafka-spout visited-topic "datawake-visited"))





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

    }


    ;; bolt configuration
    {
        "dispatch-bolt" (python-bolt-spec
            options
            {"incoming-dw-visited-spout" :shuffle }
            "datawakestreams.dispatcher.Dispatcher"
            ["url", "status", "headers", "flags", "body", "timestamp", "source","context"]
        )

    }
])
