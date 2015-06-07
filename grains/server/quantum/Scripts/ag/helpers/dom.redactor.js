var ag;
(function (ag) {
    (function (dom) {
        (function (_redactor) {
            function init($element) {
                $element.redactor({
                    minHeight: 200,
                    autoresize: false,
                    buttons: [
                        'formatting', '|',
                        'bold', 'italic', 'deleted', '|',
                        'unorderedlist', 'orderedlist', 'outdent', 'indent', '|',
                        'table', 'link', '|',
                        'alignment'],
                    deniedTags: ['html', 'head', 'link', 'body', 'meta', 'script', 'style', 'applet', 'iframe'],
                    //plugins: ['fontcolor'],
                    linkTooltip: true,
                    keydownCallback: function (e) {
                        e.stopImmediatePropagation();
                    },
                    dropdownShowCallback: function (obj) {
                        // pop up the dropdown menu to the highest z-index
                        obj.dropdown.css("z-index", ag.utils.findHighestDivZIndex());
                    },
                    modalOpenedCallback: function (modal) {
                        // pop up the modal to the highest z-index
                        var zindex = ag.utils.findHighestDivZIndex();
                        modal.parent().css("z-index", zindex - 1);
                        modal.css("z-index", zindex);
                    }
                });

                var redactor = $element.data("redactor");

                // if we update the redactor we will keep track it has the linkProcess interface still
                // because we need override it
                if (!redactor.linkProcess || !redactor.linkShow)
                    throw new Error(ag.strings.badResponse);
                else {
                    redactor.linkProcess = linkProcess;
                    redactor.linkShow = linkShow;
                }
            }
            _redactor.init = init;

            function linkShow() {
                this.selectionSave();

                var callback = $.proxy(function () {
                    // Predefined links
                    if (this.opts.predefinedLinks !== false) {
                        this.predefinedLinksStorage = {};
                        var that = this;
                        $.getJSON(this.opts.predefinedLinks, function (data) {
                            var $select = $('#redactor-predefined-links');
                            $select.html('');
                            $.each(data, function (key, val) {
                                that.predefinedLinksStorage[key] = val;
                                $select.append($('<option>').val(key).html(val.name));
                            });

                            $select.on('change', function () {
                                var key = $(this).val();
                                var name = '', url = '';
                                if (key != 0) {
                                    name = that.predefinedLinksStorage[key].name;
                                    url = that.predefinedLinksStorage[key].url;
                                }

                                $('#redactor_link_url').val(url);
                                $('#redactor_link_url_text').val(name);
                            });

                            $select.show();
                        });
                    }

                    this.insert_link_node = false;

                    var sel = this.getSelection();
                    var url = '', text = '', target = '';

                    var elem = this.getParent();
                    var par = $(elem).parent().get(0);
                    if (par && par.tagName === 'A') {
                        elem = par;
                    }

                    if (elem && elem.tagName === 'A') {
                        url = $(elem).attr("href");
                        text = $(elem).text();
                        target = elem.target;

                        this.insert_link_node = elem;
                    } else
                        text = sel.toString();

                    $('#redactor_link_url_text').val(text);

                    var thref = self.location.href.replace(/\/$/i, '');
                    url = url.replace(thref, '');
                    url = url.replace(/^\/#/, '#');
                    url = url.replace('mailto:', '');

                    // remove host from href
                    if (this.opts.linkProtocol === false) {
                        var re = new RegExp('^(http|ftp|https)://' + self.location.host, 'i');
                        url = url.replace(re, '');
                    }

                    // set url
                    $('#redactor_link_url').val(decodeURI(url));

                    if (target === '_blank') {
                        $('#redactor_link_blank').prop('checked', true);
                    }

                    this.linkInsertPressed = false;
                    $('#redactor_insert_link_btn').on('click', $.proxy(this.linkProcess, this));

                    setTimeout(function () {
                        $('#redactor_link_url').focus();
                    }, 200);
                }, this);

                this.modalInit(this.opts.curLang.link, this.opts.modal_link, 460, callback);
            }
            _redactor.linkShow = linkShow;

            function linkProcess() {
                if (this.linkInsertPressed)
                    return;

                this.linkInsertPressed = true;
                var target = '', targetBlank = '';

                var link = $('#redactor_link_url').val();
                var text = $('#redactor_link_url_text').val();

                // remvoe starting and trailing quote.
                link = link.replace(/^"/, "").replace(/"$/, "");

                // mailto
                if (link.search('@') != -1 && /(http|ftp|https):\/\//i.test(link) === false) {
                    link = 'mailto:' + link;
                }

                //
                if (link.match(/^file\:\/\//ig)) {
                    link = link;
                } else if (link.search('#') != 0) {
                    if ($('#redactor_link_blank').prop('checked')) {
                        target = ' target="_blank"';
                        targetBlank = '_blank';
                    }

                    // test url (add protocol)
                    var pattern = '((xn--)?[a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}';
                    var re = new RegExp('^(http|ftp|https)://' + pattern, 'i');
                    var re2 = new RegExp('^' + pattern, 'i');

                    if (link.search(re) == -1 && link.search(re2) == 0 && this.opts.linkProtocol) {
                        link = this.opts.linkProtocol + link;
                    }
                }

                text = text.replace(/<|>/g, '');
                var extra = '&nbsp;';
                if (this.browser('mozilla'))
                    extra = '&nbsp;';

                this.linkInsert('<a href="' + link + '"' + target + '>' + text + '</a>' + extra, $.trim(text), link, targetBlank);
            }
            _redactor.linkProcess = linkProcess;

            function redactorInit() {
                ko.utils.registerEventHandler(document, "click", function (event) {
                    var $link = $(event.target);

                    if (!$link.is('a'))
                        return;

                    if ($link.parent().hasClass("redactor-link-tooltip")) {
                        var href = $link.attr("href");

                        if (!href || href == "#" || href.length < 3)
                            return;

                        if (!ag.utils.isValidURL(href)) {
                            event.preventDefault();
                            displayLocalFileLinkMessage(href);
                        }
                    }
                });
            }
            _redactor.redactorInit = redactorInit;

            // Insert Html
            function insertHtml($element, value) {
                $element.redactor("set", value);
            }
            _redactor.insertHtml = insertHtml;

            // Get Html
            function getHTML($element) {
                return $element.redactor("get");
            }
            _redactor.getHTML = getHTML;

            function fixLinks($element) {
                var processor = function (html) {
                    var $html = $(html), content = $html.text();

                    if (_.isEmpty(content))
                        return;

                    fixBrokenLinkElement($html, content);
                };

                _.each($element.find("a"), processor);
            }
            _redactor.fixLinks = fixLinks;

            function fixBrokenLinkElement($link, content) {
                var reg = /".+?"/igm;
                content = content.replace(reg, function (s) {
                    return s.substring(1, s.length - 1);
                });

                var $parent = $link.parent();
                $parent.empty();
                $link = $("<a href=\"{0}\" target=\"_blank\">{0}</a>".format(content));
                $parent.append($link);

                return $link;
            }

            function displayLocalFileLinkMessage(href) {
                var zindex = ag.utils.findHighestDivZIndex();

                var template = '<div class="modal-scrollable" style="z-index: {0}; background-color: black; opacity: 0.2"></div>' + '<div class="modal-scrollable xclose" style="z-index: {0}">' + '   <div class="modal" data-backdrop="static" aria-hidden="false" tabindex="-1" style="display: block; margin-top: -112px;">' + '      <form onsubmit="return false;">' + '         <div class="modal-header">' + '            <div class="row-fluid">' + '               <h3 class="span8">{2}</h3>' + '               <button type="button" class="close xclose" data-dismiss="modal" aria-hidden="true">×</button>' + '            </div>' + '         </div>' + '         <div class="modal-body container-panel">' + '            <div class="panel" data-title="">' + '            <span class="editor field size6">{4}</span><p><p/>' + '               <div class="editor field size6">' + '                  <label>{3}</label>' + '                  <input class="text-box single-line valid" type="text" value="{1}" data-original-title="">' + '               </div>' + '            </div>' + '         </div>' + '         <div class="modal-footer xclose"><a href="#" class="btn xclose">Close</a></div>' + '      </form>' + '   </div>' + '</div>';

                template = template.format(zindex, href, ag.strings.redactorTitle, ag.strings.redactorFilePath, ag.strings.redactorMessage);
                var $template = $(template), removeDelegate = function () {
                    $template.remove();
                    _.delay(function () {
                        $('.redactor_editor').focus();
                    }, 500);
                };

                ko.utils.registerEventHandler($template, "click", function (event) {
                    if ($(event.target).hasClass("xclose"))
                        removeDelegate();
                });

                ko.utils.registerEventHandler($template, "keydown", function (event) {
                    if (event.keyCode == $.ui.keyCode.ESCAPE)
                        removeDelegate();
                });

                $("body").append($template);

                $($template.find('input')[0]).select();
                $($template.find('input')[0]).focus();
            }
            _redactor.displayLocalFileLinkMessage = displayLocalFileLinkMessage;

            $(function () {
                redactorInit();
            });
        })(dom.redactor || (dom.redactor = {}));
        var redactor = dom.redactor;
    })(ag.dom || (ag.dom = {}));
    var dom = ag.dom;
})(ag || (ag = {}));
