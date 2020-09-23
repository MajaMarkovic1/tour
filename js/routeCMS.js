/**
 * MTK.RouteCMS
 */

MTK.RouteCMS = {
  i18n: "en",
  translations: {
    de: {
      tour: "Die Tour",
      tourDescription: "Wegbeschreibung",
      suggestion: "Tipps",
      recommendedEquipment: "Empfohlene Ausrüstung",
      directions: "Anreise",
      publicTransport: "Öffentliche Verkehrsmittel",
      private: "Privat",
      safetyInstructions: "Sicherheitshinweise",
      showMe: "Zeige mir",
      showAll: "Alles anzeigen",
      accommodations: "Unterkünfte",
      otherRoutes: "andere Routen",
      satellite: "Satellit",
      difficulty: {
        "1": "Leicht",
        "2": "Medium",
        "3": "Schwer"
      },
      subTypes: {
        Wanderung: "hiking trali"
      }
    },
    en: {
      tour: "Tour",
      tourDescription: "Description",
      suggestion: "Suggestions",
      recommendedEquipment: "Recommended Equipment",
      directions: "Directions",
      publicTransport: "Public Transport",
      private: "Private",
      safetyInstructions: "Safety Instructions",
      showMe: "Show me",
      showAll: "Show all",
      accommodations: "Accommodations",
      otherRoutes: "Other routes",
      satellite: "Satellite",
      difficulty: {
        "1": "Easy",
        "2": "Medium",
        "3": "Hard"
      },
      subTypes: {
        Wanderung: "hiking trali"
      }
    }
  },
  // specific settings for every subtype
  _subTypeDetails: {
    default: {
      "map-style": "toursprung-terrain"
    },
    wanderung: {
      "map-style": "toursprung-terrain"
    },
    fernwanderweg: {
      "map-style": "toursprung-terrain"
    },
    themenweg: {
      "map-style": "toursprung-terrain"
    },
    winterwandern: {
      "map-style": "toursprung-terrainwinter"
    },
    bergtour: {
      "map-style": "toursprung-terrain"
    },
    hochtour: {
      "map-style": "toursprung-terrain"
    },
    jogging: {
      "map-style": "toursprung-terrain"
    },
    trailrunning: {
      "map-style": "toursprung-terrain"
    },
    "nordic-walking": {
      "map-style": "toursprung-terrain"
    },
    klettersteig: {
      "map-style": "toursprung-terrain"
    },
    langlauf: {
      "map-style": "toursprung-terrainwinter"
    },
    mountainbike: {
      "map-style": "toursprung-terrain"
    },
    skitour: {
      "map-style": "toursprung-terrainwinter"
    },
    "ski-freeride": {
      "map-style": "toursprung-terrainwinter"
    },
    rodeln: {
      "map-style": "toursprung-terrainwinter"
    },
    pferdeschlitten: {
      "map-style": "toursprung-terrainwinter"
    }
  }
};

// Hash Handling
MTK.RouteCMS.Hash = {
  duringSet: false,
  set: function(filter) {
    this.duringSet = true;
    var hash = [];
    for (var k in filter) {
      let v = filter[k];
      if (v && typeof v == "object") hash.push(k + "=" + v.join(","));
    }
    location.hash = hash.join("&");
    setTimeout(() => (MTK.RouteCMS.Hash.duringSet = false), 500);
  },
  get: function() {
    var hash = {};
    decodeURIComponent(location.hash)
      .substring(1)
      .split("&")
      .forEach(h => {
        if (h.match(/(\w+)=([\w,-]+)/)) hash[RegExp.$1] = RegExp.$2.split(",");
      });
    return hash;
  }
};

// Index Page
MTK.RouteCMS.RouteList = class {
  constructor(map, customer) {
    // routeCMS_routes resource filter object
    this.filter = {
      customer: customer,
      tags: null,
      difficulty: null,
      distance_class: null,
      ascent_class: null,
      duration_class: null,
      subtype: null
    };

    // de/serialize filter state to location.hash
    this.checkHash();
    window.addEventListener("hashchange", () => {
      if (!this.checkHash()) return;
      this.v.$refs.difficultyModal.difficulty = this.filter.difficulty;
      this.v.$refs.moreModal.setSliderDefaults();
      this.v.$refs.moreModal.$forceUpdate();
      this.v.$forceUpdate();
      this.reloadList();
    });

    // init all Vue instances
    this.initVue();

    // load list-items
    this.map = map;
    this.bounds = map.leaflet.getBounds();
    this.reloadList();
  }

  refreshList() {
    if (this._refresh) clearTimeout(this._refresh);
    this._refresh = setTimeout(() => {
      let map = this;
      if (!map) return;
      routeList.bounds = map.getBounds();
      routeList.reloadList();
    }, 750);
  }

  filterClasses(name) {
    return {
      distance: [
        "0",
        "10",
        "20",
        "30",
        "50",
        "70",
        "100",
        "200",
        "500",
        "500+"
      ],
      ascent: [
        "0",
        "100",
        "200",
        "300",
        "500",
        "700",
        "1000",
        "1500",
        "2000",
        "2000+"
      ],
      duration: [
        "0",
        "15",
        "30",
        "60",
        "120",
        "180",
        "300",
        "480",
        "600",
        "600+"
      ]
    }[name];
  }

  checkHash() {
    if (MTK.RouteCMS.Hash.duringSet) return false;
    let hash = MTK.RouteCMS.Hash.get();
    for (var k in this.filter) this.filter[k] = hash[k];
    return true;
  }

  filtersChanged() {
    MTK.RouteCMS.Hash.set(this.filter);
    this.reloadList();
  }

  resetFilters(modal) {
    jQuery(
      "[data-type='" +
        modal +
        "'] .modal-container .checkbox input[type='checkbox']:checked"
    ).trigger("click");
    jQuery("[data-type='" + modal + "'] .modal-container .noUi-target").each(
      (i, e) => {
        e.noUiSlider.reset();
      }
    );
    this.filtersChanged();
  }

  reloadList() {
    this.v.items = [];
    this.v.loading = true;
    let filter = this.filter;
    this.filter.language = MTK.RouteCMS.i18n;
    jQuery.getJSONP(
      "https://index.maptoolkit.net",
      {
        apiKey: MTK.api_key,
        zoom: this.map.leaflet.getZoom(),
        north: this.bounds.getNorth(),
        east: this.bounds.getEast(),
        south: this.bounds.getSouth(),
        west: this.bounds.getWest(),
        width: this.map.leaflet.getSize().x,
        height: this.map.leaflet.getSize().y,
        resources: jQuery.toJSON({ routeCMS_routes: this.filter })
      },
      data => {
        var ids = data.features
          .filter(item => {
            return (
              item.properties.type == "item" &&
              this.bounds.contains($P(item.geometry.coordinates.reverse()))
            );
          })
          .sort((a, b) => {
            return b.properties.order - a.properties.order;
          })
          .map(item => item.properties.id);
        this.v.allItemCount = ids.length;
        jQuery.getJSONP(
          "https://items.maptoolkit.net",
          {
            apiKey: MTK.api_key,
            ids: jQuery.toJSON(ids),
            thumbnail_size: "510x350"
          },
          data => {
            // add thumbnail on second place in images-array
            data.features.forEach(f => {
              let subtype = f.properties.data.subtype
                .toLowerCase()
                .replace(" ", "-");
              let thumbnail = {
                url: `${f.properties.thumbnail}&factor=2&maptype=${
                  MTK.RouteCMS._subTypeDetails[
                    subtype in MTK.RouteCMS._subTypeDetails
                      ? subtype
                      : "default"
                  ]["map-style"]
                }&marker=icon:https://static.maptoolkit.net/routeCMS/images/tours/marker/marker-start@2x.png|center:${f.geometry.coordinates
                  .reverse()
                  .join(",")}`,
                title: "Route preview"
              };
              if (f.properties.data.images.length)
                f.properties.data.images.splice(1, 0, thumbnail);
              else f.properties.data.images = [thumbnail];
            });
            // reload item list
            this.v.items = data.features.map(f => f.properties);
            // trigger other stuff
            this.v.gotoPage(0);
            this.v.loading = false;
          }
        );
      }
    );
  }

  initVue(el) {
    var that = this;
    // VUE components, Modal-Window, Difficulty-Menu, More-Menu
    Vue.component("Modal", {
      template: "#modal-template",
      props: ["show", "x", "y"],
      methods: {
        close: function() {
          this.$emit("close");
        }
      },
      mounted: function() {
        document.addEventListener("keydown", e => {
          if (this.show && e.keyCode == 27) {
            this.close();
          }
        });
      },
      updated: function() {
        //add checked filter class after render
        jQuery(".modal-container .checkbox input[type='checkbox']:checked")
          .parent()
          .addClass("checked");
      }
    });

    Vue.component("DifficultyModal", {
      template: "#difficulty-modal-template",
      props: ["show", "x", "y"],
      data: function() {
        return { difficulty: that.filter.difficulty || [] };
      },
      computed: {
        easy: {
          get: function() {
            return this.difficulty.indexOf("1") != -1;
          },
          set: function(value) {
            this.updateDifficulty("1", value);
          }
        },
        intermediate: {
          get: function() {
            return this.difficulty.indexOf("2") != -1;
          },
          set: function(value) {
            this.updateDifficulty("2", value);
          }
        },
        difficult: {
          get: function() {
            return this.difficulty.indexOf("3") != -1;
          },
          set: function(value) {
            this.updateDifficulty("3", value);
          }
        }
      },
      methods: {
        close: function() {
          this.$emit("close");
        },
        updateDifficulty(value, boolean) {
          this.difficulty = this.difficulty.filter(d => value != d);
          if (boolean) this.difficulty.push(value);
          that.filter.difficulty = this.difficulty.length
            ? this.difficulty
            : null;
          that.filtersChanged();
        }
      }
    });

    Vue.component("SubtypeModal", {
      template: "#subtype-modal-template",
      props: ["show", "x", "y", "is_type", "toggle_type"],
      data: function() {
        return { difficulty: that.filter.subtype || [] };
      },
      methods: {
        close: function() {
          this.$emit("close");
        }
      }
    });

    Vue.component("MoreModal", {
      template: "#more-modal-template",
      props: ["show", "x", "y", "has_tag", "toggle_tag"],
      methods: {
        createSliderHandler: function(name) {
          return function(values) {
            let from = parseInt(values[0]),
              to = parseInt(values[1]);
            $("." + name + "_from").html(that.filterClasses(name)[from]);
            $("." + name + "_to").html(that.filterClasses(name)[to]);
            that.filter[name + "_class"] = that
              .filterClasses(name)
              .slice(from, to == 9 ? 10 : to);
            if (that.filter[name + "_class"].length == 10)
              that.filter[name + "_class"] = null;
          };
        },
        getSliderDefaults: function(objs, obj) {
          if (!obj) return [0, 9];
          let i0 = objs.indexOf(obj[0]),
            i1 = objs.indexOf(obj[obj.length - 1]) + 1;
          return [i0 != -1 ? i0 : 0, i1 != -1 ? i1 : 0];
        },
        setSliderDefaults: function() {
          this.distanceSlider.set(
            this.getSliderDefaults(
              that.filterClasses("distance"),
              that.filter.distance_class
            )
          );
          this.ascentSlider.set(
            this.getSliderDefaults(
              that.filterClasses("ascent"),
              that.filter.ascent_class
            )
          );
          this.durationSlider.set(
            this.getSliderDefaults(
              that.filterClasses("duration"),
              that.filter.duration_class
            )
          );
        },
        close: function() {
          this.$emit("close");
        }
      },
      mounted: function() {
        let sliderOptions = {
          connect: true,
          step: 1,
          range: { min: 0, max: 9 },
          start: [0, 10]
        };
        this.distanceSlider = noUiSlider.create(
          document.getElementById("distance_slider"),
          sliderOptions
        );
        this.ascentSlider = noUiSlider.create(
          document.getElementById("ascent_slider"),
          sliderOptions
        );
        this.durationSlider = noUiSlider.create(
          document.getElementById("duration_slider"),
          sliderOptions
        );
        this.setSliderDefaults();
        this.distanceSlider.on("update", this.createSliderHandler("distance"));
        this.ascentSlider.on("update", this.createSliderHandler("ascent"));
        this.durationSlider.on("update", this.createSliderHandler("duration"));
        this.distanceSlider.on("change", () => {
          that.filtersChanged();
        });
        this.ascentSlider.on("change", () => {
          that.filtersChanged();
        });
        this.durationSlider.on("change", () => {
          that.filtersChanged();
        });
      }
    });

    Vue.component("ListPlaceholder", {
      template: "#list-placeholder"
    });

    // Main VUE Object
    this.v = new Vue({
      el: "#app",
      data: {
        i18n: MTK.RouteCMS.i18n,
        allItemCount: 0,
        difficulty: MTK.RouteCMS.translations[MTK.RouteCMS.i18n].difficulty,
        loading: false,
        showSubtypeModal: false,
        showDifficultyModal: false,
        showMoreModal: false,
        modalX: 100,
        modalY: 100,
        items: [],
        itemsPerPage: 12,
        pageNumber: 0
      },
      computed: {
        pageItems: function() {
          let start = this.pageNumber * this.itemsPerPage;
          return this.items.slice(start, start + this.itemsPerPage);
        },
        pageCount: function() {
          return Math.ceil(this.items.length / this.itemsPerPage);
        },
        hasDifficulties: function() {
          return this.showDifficultyModal || that.filter.difficulty;
        },
        hasSubtype: function() {
          return this.showSubtypeModal || that.filter.subtype;
        },
        hasMore: function() {
          return (
            this.showMoreModal ||
            that.filter.distance_class ||
            that.filter.ascent_class ||
            that.filter.duration_class ||
            that.filter.tags
          );
        }
      },
      methods: {
        gotoPage(nr) {
          this.pageNumber = nr;
          that.map.config.resources.routeCMS_routes.ids = this.pageItems.map(
            i => i.id
          );
          that.map.refresh();
          if (that._swiper) {
            that._swiper = Array.isArray(that._swiper)
              ? that._swiper
              : [that._swiper];
            that._swiper.forEach(s => s.destroy());
          }
          setTimeout(function() {
            that._swiper = new Swiper(".list .gallery", {
              direction: "horizontal",
              loop: true,
              paginationClickable: true,
              pagination: {
                clickable: true,
                el: ".swiper-pagination",
                dynamicBullets: true
              },
              navigation: {
                nextEl: ".swiper-button-next",
                prevEl: ".swiper-button-prev"
              }
            });
          }, 0);
          window.scrollTo(0, 0);
        },
        hasTag: function(tag) {
          return (that.filter.tags || []).indexOf(tag) != -1;
        },
        isSubtype: function(type) {
          return (that.filter.subtype || []).indexOf(type) != -1;
        },
        toggleTag: function(tag) {
          that.filter.tags = that.filter.tags || [];
          if (this.hasTag(tag))
            that.filter.tags = that.filter.tags.filter(t => t != tag);
          else that.filter.tags.push(tag);
          if (!that.filter.tags.length) that.filter.tags = null;
          this.$forceUpdate(); // FIXME: may remove this hack
          that.filtersChanged();
        },
        toggleSubtype: function(type) {
          that.filter.subtype = that.filter.subtype || [];
          if (this.isSubtype(type))
            that.filter.subtype = that.filter.subtype.filter(t => t != type);
          else that.filter.subtype.push(type);
          if (!that.filter.subtype.length) that.filter.subtype = null;
          this.$forceUpdate(); // FIXME: may remove this hack
          that.filtersChanged();
        },
        openModal: function(modal, event) {
          this.closeModal();
          let pos = event.target.getBoundingClientRect();
          this.modalX = pos.x;
          this.modalY = pos.y + pos.height;
          this[modal] = true;
        },
        closeModal: function() {
          this.showDifficultyModal = false;
          this.showSubtypeModal = false;
          this.showMoreModal = false;
        }
      }
    });
  }
};

// Route Page
MTK.RouteCMS.RouteDetails = class {
  constructor(containerSelector, routeId) {
    this._visitorOnMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
      ? true
      : false;
    this._routeId = [routeId];
    this._vue(containerSelector);
    // spoiler for paragraphes set dynamically (depending on paragraph size)
    jQuery(window).on("resize", e => {
      this._setSpoilers();
    });
    this._getTour(null, () => {
      this._adjustTags();
      this._setData();
      setTimeout(() => {
        this._gallery = this._setupGallery(
          containerSelector + " #headline .gallery"
        );
      }, 0);
      this._mapControls();
      this._setupMTK(map => {
        this._bindEvents();
      });
      this._getNearTours();
    });
  }
  _vue(container) {
    let that = this;
    Vue.component("ModulePlaceholder", {
      template: "#module-placeholder"
    });
    Vue.component("ParagraphPlaceholder", {
      template: "#paragraph-placeholder"
    });
    Vue.component("HeaderPlaceholder", {
      template: "#header-placeholder"
    });
    Vue.component("HeadlinePlaceholder", {
      template: "#headline-placeholder"
    });
    Vue.component("ListPlaceholder", {
      template: "#list-placeholder"
    });
    Vue.component("ShareModal", {
      template: "#share-modal",
      props: ["show", "url", "image", "tour", "mobile"],
      methods: {
        close: function() {
          that._closeShareModal();
        }
      },
      mounted: function() {
        document.addEventListener("keydown", e => {
          if (this.show && e.keyCode == 27) {
            this.close();
          }
        });
      }
    });
    this._vue = new Vue({
      el: container,
      data: {
        i18n: MTK.RouteCMS.i18n,
        difficulties: MTK.RouteCMS.translations[MTK.RouteCMS.i18n].difficulty,
        _dataReceived: false,
        title: null,
        description: null,
        tags: null,
        subtype: MTK.RouteCMS.translations[MTK.RouteCMS.i18n].subTypes,
        difficulty: null,
        time: null,
        distance: null,
        author: null,
        ascent: null,
        descent: null,
        thumbnail: null,
        images: null,
        recommended: null,
        gpx: null,
        info: null,
        showShareModal: false,
        shareUrl: window.location.href,
        numberOfRecommendations: 3
      },
      updated: function() {
        this.$nextTick(function() {
          that._setSpoilers();
        });
      }
    });
  }
  _bindEvents() {
    // scrolling from static map to interactive map
    jQuery(".static-preview>a").on("click", e => {
      window.scrollTo({
        top: document.getElementById("interactive_map").offsetTop,
        behavior: "smooth"
      });
    });
    // redirection to other routes
    // in list
    jQuery(document).on("click", ".element", evt => {
      if (!evt.target.className.match(/swiper/i)) {
        window.location.hash =
          "#id=" + evt.currentTarget.getAttribute("data-id");
        window.location.reload();
      }
    });
    // in map
    let currentOverlay = null;
    MTK.event.addListener(this._map, "Overlay.click", o => {
      currentOverlay = o;
    });
    MTK.event.addListener(this._map, "InfoWindow.clicked", e => {
      if (currentOverlay && currentOverlay.item.data.type == "tour")
        window.location.hash = "#id=" + currentOverlay.item.id;
    });
  }
  // init swiper gallery
  _setupGallery(selector) {
    return new Swiper(selector, {
      direction: "horizontal",
      loop: true,
      paginationClickable: true,
      watchOverflow: true,
      pagination: {
        clickable: true,
        el: ".swiper-pagination",
        dynamicBullets: true
      },
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev"
      }
    });
  }
  _closeShareModal() {
    this._vue.showShareModal = false;
  }
  _openShareModal() {
    this._vue.showShareModal = true;
  }
  _formatDistance(metre) {
    var km = (metre / 1000).toFixed(1);
    return `${km}`;
  }
  _formatTime(minutes) {
    var hrs = Math.floor(minutes / 60),
      min = minutes % 60;

    return `${hrs < 10 ? `0${hrs}` : hrs}:${min < 10 ? `0${min}` : min}`;
  }
  // get tour data
  _getTour(routeIds, callback) {
    var ids = routeIds || this._routeId;
    jQuery.getJSON(
      "https://items.maptoolkit.net/?apiKey=routeCMS&thumbnail_size=510x350&ids=[" +
        ids.join(",") +
        "]",
      d => {
        //187cde39-5953-490e-b428-f2de4b75a4d0
        if (!routeIds) this._tourData = d;
        callback(d);
      }
    );
  }
  // get tours for list
  _getNearTours(callback) {
    var route = this._tourData.features[0].properties.route,
      center = L.latLngBounds(
        [route.bounds.north, route.bounds.west],
        [route.bounds.south, route.bounds.east]
      ).getCenter(),
      config = {
        routeCMS_routes: {}
      };
    jQuery.getJSONP(
      "https://index.maptoolkit.net",
      {
        apiKey: MTK.api_key,
        zoom: 12,
        north: 47.27317275941787,
        east: 10.237884521484377,
        south: 47.147466031462834,
        west: 10.066223144531252,
        width: 500,
        height: 539,
        resources: jQuery.toJSON({
          routeCMS_routes: {
            subtype: this._tourData.features[0].properties.data.subtype,
            language: MTK.RouteCMS.i18n
          }
        })
      },
      d => {
        let length =
            d.features.length <= this._vue.numberOfRecommendations
              ? d.features.length
              : this._vue.numberOfRecommendations,
          ids = [];
        for (var i = 0; i < d.features.length; i++) {
          if (ids.length >= length) break;
          if (
            d.features[i].properties.remoteid !==
            this._tourData.features[0].properties.remoteid
          )
            ids.push(d.features[i].properties.id);
        }
        let recommended = [];
        this._getTour(ids, tours => {
          for (var i = 0; i < tours.features.length; i++) {
            let subtype = tours.features[i].properties.data.subtype
              .toLowerCase()
              .replace(" ", "-");
            recommended.push({
              id: tours.features[i].properties.id,
              title: tours.features[i].properties.data.content.name,
              subtype: subtype,
              difficulty: tours.features[i].properties.data.rating.difficulty,
              time: this._formatTime(
                tours.features[i].properties.data.route.walking_time
              ),
              distance: this._formatDistance(
                tours.features[i].properties.route.distance
              ),
              ascent: tours.features[i].properties.route.ascent,
              descent: tours.features[i].properties.route.descent,
              thumbnail: `${tours.features[i].properties.thumbnail}&maptype=${
                MTK.RouteCMS._subTypeDetails[subtype]["map-style"]
              }&marker=icon:https://static.maptoolkit.net/routeCMS/images/tours/marker/marker-start.png|center:${tours.features[
                i
              ].geometry.coordinates
                .reverse()
                .join(",")}`,
              images: tours.features[i].properties.data.images
            });
            let thumbnail = {
              url: recommended[recommended.length - 1].thumbnail,
              title: "RoutePreview"
            };
            if (tours.features[i].properties.data.images.length)
              tours.features[i].properties.data.images.splice(1, 0, thumbnail);
            else tours.features[i].properties.data.images = [thumbnail];
          }
          this._vue.recommended = recommended;
          // calls swiper init async
          setTimeout(function() {
            new Swiper("#recommended .gallery", {
              direction: "horizontal",
              loop: true,
              paginationClickable: true,
              pagination: {
                clickable: true,
                el: ".swiper-pagination",
                dynamicBullets: true
              },
              navigation: {
                nextEl: ".swiper-button-next",
                prevEl: ".swiper-button-prev"
              }
            });
            window.dispatchEvent(new Event("resize"));
          }, 0);
        });
      }
    );
  }
  // sets received tour data in vue
  _setData() {
    var d = this._tourData.features[0],
      v = this._vue,
      i18n = this._vue.i18n,
      translations = MTK.RouteCMS.translations;
    v._dataReceived = true;
    v.tags = d.properties.data.tags;
    v.author = d.properties.data.author.replace(/<(\/)?[A-z]+>/g, "");
    v.subtype = d.properties.data.subtype.replace(" ", "-").toLowerCase();
    v.difficulty = d.properties.data.rating.difficulty;
    v.title = d.properties.data.content.name;
    v.description = d.properties.data.content.description;
    v.info = [
      {
        show: Boolean(d.properties.data.content.text),
        title: translations[i18n].tour,
        content: [{ text: d.properties.data.content.text }]
      },
      {
        show: Boolean(d.properties.data.content.instructions),
        title: translations[i18n].tourDescription,
        content: [{ text: d.properties.data.content.instructions }]
      },
      {
        show: Boolean(d.properties.data.content.suggestion),
        title: translations[i18n].suggestion,
        content: [{ text: d.properties.data.content.suggestion }]
      },
      {
        show: Boolean(d.properties.data.content.equipment),
        title: translations[i18n].recommendedEquipment,
        content: [{ text: d.properties.data.content.equipment }]
      },
      {
        show:
          d.properties.data.content.directionsPublicTransport &&
          d.properties.data.content.directions,
        title: translations[i18n].directions,
        content: [
          {
            subtitle: translations[i18n].publicTransport,
            text: d.properties.data.content.directionsPublicTransport
          },
          {
            subtitle: translations[i18n].private,
            text: d.properties.data.content.directions
          },
          { text: d.properties.data.content.parking }
        ]
      },
      {
        show: Boolean(d.properties.data.content.safetyInstructions),
        title: translations[i18n].safetyInstructions,
        content: [{ text: d.properties.data.content.safetyInstructions }]
      }
    ];
    v.time = this._formatTime(d.properties.data.route.walking_time);
    v.ascent = d.properties.route.ascent;
    v.distance = this._formatDistance(d.properties.route.distance);
    v.descent = d.properties.route.descent;
    v.thumbnail = `${d.properties.thumbnail}&factor=2&maptype=${
      MTK.RouteCMS._subTypeDetails[v.subtype]["map-style"]
    }&marker=icon:https://static.maptoolkit.net/routeCMS/images/tours/marker/marker-start@2x.png|center:${d.geometry.coordinates
      .reverse()
      .join(",")}`;
    v.images = d.properties.data.images;
    v.gpx = `https://maptoolkit.net/export/routeCMS_routes/${
      d.properties.remoteid
    }.gpx`;
    let lat = d.geometry.coordinates[0],
      lng = d.geometry.coordinates[1];
  }
  // defines interactive map controls
  _mapControls() {
    // resource filter tree menu
    this._TreeMenu = L.Control.extend({
      options: {
        position: "topright"
      },
      // filtering osm resource
      _filter(bool, resource, prop, val) {
        var res = MTK.maps.map.config.resources[resource];
        if (!bool)
          res.filter[prop].splice(
            res.filter[prop].indexOf(val),
            res.filter[prop].indexOf(val) + 1
          );
        else res.filter[prop].push(val);
        MTK.maps.map.refresh();
      },
      _toggle(bool, resource) {
        MTK.maps.map.config.resources[resource].show = bool ? "all" : "none";
        MTK.maps.map.refresh();
      },
      // draw control, the map parameter is type of Leaflet.Map
      onAdd: function(map) {
        var that = this,
          routeCMS = MTK.RouteCMS;
        var filterCheckbox = [
          "images/symbols/checkbox-unticked.svg",
          "images/symbols/checkbox-ticked.svg"
        ];
        that.mtkmap = map._mtkmap; // remember the MTK.Map Object

        // create tree menu container
        var container = L.DomUtil.create("div");
        L.DomEvent.disableClickPropagation(container);
        container.id = "lechzuers_treemenu";

        // add tree menu to container
        new MTK.TreeMenu(
          container,
          [
            {
              title: `${
                routeCMS.translations[routeCMS.i18n].showMe
              }<i class='icon-arrow-right'></i>`,
              checked: false,
              children: [
                {
                  title: routeCMS.translations[routeCMS.i18n].accommodations,
                  icon: false,
                  checkbox: filterCheckbox,
                  checked: false,
                  onclick: function(bool) {
                    that._filter(bool, "routeCMS_pois", "type", "unterkunft");
                  }
                },
                {
                  title: routeCMS.translations[routeCMS.i18n].otherRoutes,
                  icon: false,
                  checkbox: filterCheckbox,
                  checked: false,
                  onclick: function(bool) {
                    that._toggle(bool, "routeCMS_routes");
                  }
                }
              ]
            }
          ],
          {
            map: that.mtkmap
          }
        );
        return container;
      }
    });
    // maptype switch control
    this._MapTypes = L.Control.extend({
      options: {
        position: "topright",
        activeMapType:
          MTK.RouteCMS._subTypeDetails[this._vue.subtype]["map-style"],
        mapTypes: [
          { id: "toursprung-terrain", name: "Terrain" },
          { id: "toursprung-terrainwinter", name: "Winter" },
          {
            id: "bing_satellite",
            name: MTK.RouteCMS.translations[MTK.RouteCMS.i18n].satellite
          }
        ]
      },
      // draw control, the map parameter is type of Leaflet.Map
      onAdd: function(map) {
        var that = this;
        that.mtkmap = map._mtkmap; // remember the MTK.Map Object

        // create tree menu container
        var container = L.DomUtil.create("div");
        L.DomEvent.disableClickPropagation(container);
        container.id = "lechzuers_maptypes";
        container.className = "lechzuers-maptypes-switch";

        // add maptypes to container
        var button = document.createElement("button");
        button.innerHTML = "<i class='icon-map-layers'></i>";
        button.className = "lechzuers-maptypes-switch-button";

        var list = document.createElement("ul"),
          types = that.options.mapTypes;
        list.className = "lechzuers-maptypes-switch-list";
        list.style = "display:none";
        for (var i = 0; i < types.length; i++) {
          let li = document.createElement("li"),
            id = types[i].id;
          li.innerText = types[i].name;
          if (id == that.options.activeMapType) li.className = "active";
          jQuery(li).on("click", e => {
            that.mtkmap.setMapTypeId(id);
            jQuery(e.currentTarget)
              .parent()
              .children()
              .removeClass("active");
            e.currentTarget.className = "active";
          });
          list.appendChild(li);
        }

        that._active = false;
        jQuery(button).on("click", e => {
          jQuery(e.currentTarget).toggleClass("active");
          that._active = !that._active;
          if (that._active) jQuery(list).slideDown(100);
          else jQuery(list).slideUp(100);
        });

        container.appendChild(button);
        container.appendChild(list);

        return container;
      }
    });
  }
  // init MTK map
  _setupMTK(callback) {
    var d = this._tourData.features[0];
    new MTK.ElevationProfile2({
      options: {
        profile: `https://maptoolkit.net/export/routeCMS_routes/${
          d.properties.remoteid
        }.json`,
        appendTo: "elevationprofile"
      }
    });

    MTK.init({
      apiKey: "lechzuers",
      bingMaps: {
        apiKey:
          "AqPyRIT-pMqiCiXzJ3oU9uIxb8vdRcQ1cRbz_8kAx6hL4DSUEEsL6OFfqV14KDKr"
      } // valid BING API Key needed to use Bing Satellite
    }).createMap(
      "map",
      {
        map: {
          location: {
            center: $P(48.174328, 16.232299),
            zoom: 10
          },
          mapType: MTK.RouteCMS._subTypeDetails[this._vue.subtype]["map-style"],
          options: {
            scrollWheelZoom: false,
            zoomControl: false,
            dragging: !this._visitorOnMobile,
            tap: !this._visitorOnMobile
          },
          controls: [this._TreeMenu, this._MapTypes]
        },
        resources: {
          routeCMS_pois: {
            clusters: true,
            filter: {
              type: []
            },
            show: "all",
            icon: {
              iconUrl: "images/tours/marker/hotel.svg",
              iconSize: [26, 31],
              iconAnchor: [13, 31]
            }
          },
          routeCMS_routes: {
            clusters: true,
            filter: {
              language: MTK.RouteCMS.i18n
            },
            show: "none",
            icon: function(item) {
              return {
                iconUrl: `images/tours/marker/${item.data.subtype
                  .replace(" ", "-")
                  .toLowerCase()}.svg`,
                iconSize: [26, 31],
                iconAnchor: [13, 31]
              };
            }
          }
        }
      },
      map => {
        this._map = map;
        L.control
          .zoom({
            position: "bottomleft"
          })
          .addTo(map.leaflet);
        let polyline = new MTK.Polyline({
          id: d.properties.id,
          map: map,
          color: "#bf245f",
          weight: 5,
          opacity: 1
        });
        MTK.event.addListener(polyline, "load", () => {
          map.leaflet.fitBounds(polyline.getBounds());
          new MTK.ElevationProfile2({
            options: {
              profile: polyline.getLatLngs(),
              map: map
            }
          });
        });
        new MTK.Marker({
          position: d.geometry.coordinates,
          map: map,
          icon: {
            iconSize: [30, 30],
            iconAnchor: [11, 11],
            popupAnchor: [1, -23],
            iconUrl: "images/tours/marker/marker-start.png"
          }
        });
        callback(map);
      }
    );
  }
  // wording changes for tags
  _adjustTags() {
    let tags = this._tourData.features[0].properties.data.tags;
    for (var i = 0; i < tags.length; i++) {
      if (tags[i].toLowerCase() == "aussichtsreich") tags[i] = "gute Aussicht";
    }
  }
  // sets spoilers for too large paragraphs
  _setSpoilers() {
    jQuery(this._vue._vnode.elm)
      .find(".paragraph .sub")
      .each((i, e) => {
        let $e = jQuery(e),
          $spoiler = jQuery(
            "<a class='spoiler'>" +
              MTK.RouteCMS.translations[MTK.RouteCMS.i18n].showAll +
              "<i class='icon-arrow-down' style='padding:0 10px'></i></a>"
          ),
          height = $e.find("div").innerHeight();
        if (height >= 250 && !$e.hasClass("spoiled")) {
          $e.addClass("spoiled");
          $spoiler.on("click", e => {
            $e.toggleClass("open");
            jQuery(e.currentTarget)
              .find("i")
              .toggleClass("icon-arrow-up icon-arrow-down");
          });
          $e.after($spoiler);
        }
        if (height < 250 && $e.hasClass("spoiled")) {
          $e.removeClass("spoiled");
          $e.parent()
            .find(".spoiler")
            .remove();
        }
      });
  }
  // latlng to lnglat
  _latLngSwap(coordinates) {
    for (var i = 0; i < coordinates.length; i++) {
      if (typeof coordinates[i] != "number")
        for (var j = 0; j < coordinates[i].length; j++) {
          coordinates[i][j][0] = [
            coordinates[i][j][1],
            (coordinates[i][j][1] = coordinates[i][j][0])
          ][0];
        }
    }
    return coordinates;
  }
};
