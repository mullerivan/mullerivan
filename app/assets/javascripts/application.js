// This is a manifest file that'll be compiled into application.js, which will include all the files
// listed below.
//
// Any JavaScript/Coffee file within this directory, lib/assets/javascripts, vendor/assets/javascripts,
// or vendor/assets/javascripts of plugins, if any, can be referenced here using a relative path.
//
// It's not advisable to add code directly here, but if you do, it'll appear at the bottom of the
// compiled file.
//
// Read Sprockets README (https://github.com/sstephenson/sprockets#sprockets-directives) for details
// about supported directives.
//
//= require jquery
//= require jquery_ujs
//= require turbolinks
//= require_tree .

(function($, undefined) {
    // Shorthand to make it a little easier to call public rails functions from within rails.js
    var rails;

    $.rails = rails = {
        // Link elements bound by jquery-ujs
        linkClickSelector: 'a[data-confirm], a[data-method], a[data-remote], a[data-disable-with]',

        // Select elements bound by jquery-ujs
        inputChangeSelector: 'select[data-remote], input[data-remote], textarea[data-remote]',

        // Form elements bound by jquery-ujs
        formSubmitSelector: 'form',

        // Form input elements bound by jquery-ujs
        formInputClickSelector: 'form input[type=submit], form input[type=image], form button[type=submit], form button:not(button[type])',

        // Form input elements disabled during form submission
        disableSelector: 'input[data-disable-with], button[data-disable-with], textarea[data-disable-with]',

        // Form input elements re-enabled after form submission
        enableSelector: 'input[data-disable-with]:disabled, button[data-disable-with]:disabled, textarea[data-disable-with]:disabled',

        // Form required input elements
        requiredInputSelector: 'input[name][required]:not([disabled]),textarea[name][required]:not([disabled])',

        // Form file input elements
        fileInputSelector: 'input:file',

        // Link onClick disable selector with possible reenable after remote submission
        linkDisableSelector: 'a[data-disable-with]',

        // Make sure that every Ajax request sends the CSRF token
        CSRFProtection: function(xhr) {
            var token = $('meta[name="csrf-token"]').attr('content');
            if (token) xhr.setRequestHeader('X-CSRF-Token', token);
        },

        // Triggers an event on an element and returns false if the event result is false
        fire: function(obj, name, data) {
            var event = $.Event(name);
            obj.trigger(event, data);
            return event.result !== false;
        },

        // Default confirm dialog, may be overridden with custom confirm dialog in $.rails.confirm
        confirm: function(message) {
            return confirm(message);
        },

        // Default ajax function, may be overridden with custom function in $.rails.ajax
        ajax: function(options) {
            return $.ajax(options);
        },

        // Submits "remote" forms and links with ajax
        handleRemote: function(element) {
            var method, url, data,
                crossDomain = element.data('cross-domain') || null,
                dataType = element.data('type') || ($.ajaxSettings && $.ajaxSettings.dataType),
                options;

            if (rails.fire(element, 'ajax:before')) {

                if (element.is('form')) {
                    method = element.attr('method');
                    url = element.attr('action');
                    data = element.serializeArray();
                    // memoized value from clicked submit button
                    var button = element.data('ujs:submit-button');
                    if (button) {
                        data.push(button);
                        element.data('ujs:submit-button', null);
                    }
                } else if (element.is(rails.inputChangeSelector)) {
                    method = element.data('method');
                    url = element.data('url');
                    data = element.serialize();
                    if (element.data('params')) data = data + "&" + element.data('params');
                } else {
                    method = element.data('method');
                    url = element.attr('href');
                    data = element.data('params') || null;
                }

                options = {
                    type: method || 'GET', data: data, dataType: dataType, crossDomain: crossDomain,
                    // stopping the "ajax:beforeSend" event will cancel the ajax request
                    beforeSend: function(xhr, settings) {
                        if (settings.dataType === undefined) {
                            xhr.setRequestHeader('accept', '*/*;q=0.5, ' + settings.accepts.script);
                        }
                        return rails.fire(element, 'ajax:beforeSend', [xhr, settings]);
                    },
                    success: function(data, status, xhr) {
                        element.trigger('ajax:success', [data, status, xhr]);
                    },
                    complete: function(xhr, status) {
                        element.trigger('ajax:complete', [xhr, status]);
                    },
                    error: function(xhr, status, error) {
                        element.trigger('ajax:error', [xhr, status, error]);
                    }
                };
                // Only pass url to `ajax` options if not blank
                if (url) { options.url = url; }

                return rails.ajax(options);
            } else {
                return false;
            }
        },

        // Handles "data-method" on links such as:
        // <a href="/users/5" data-method="delete" rel="nofollow" data-confirm="Are you sure?">Delete</a>
        handleMethod: function(link) {
            var href = link.attr('href'),
                method = link.data('method'),
                target = link.attr('target'),
                csrf_token = $('meta[name=csrf-token]').attr('content'),
                csrf_param = $('meta[name=csrf-param]').attr('content'),
                form = $('<form method="post" action="' + href + '"></form>'),
                metadata_input = '<input name="_method" value="' + method + '" type="hidden" />';

            if (csrf_param !== undefined && csrf_token !== undefined) {
                metadata_input += '<input name="' + csrf_param + '" value="' + csrf_token + '" type="hidden" />';
            }

            if (target) { form.attr('target', target); }

            form.hide().append(metadata_input).appendTo('body');
            form.submit();
        },

        /* Disables form elements:
         - Caches element value in 'ujs:enable-with' data store
         - Replaces element text with value of 'data-disable-with' attribute
         - Sets disabled property to true
         */
        disableFormElements: function(form) {
            form.find(rails.disableSelector).each(function() {
                var element = $(this), method = element.is('button') ? 'html' : 'val';
                element.data('ujs:enable-with', element[method]());
                element[method](element.data('disable-with'));
                element.prop('disabled', true);
            });
        },

        /* Re-enables disabled form elements:
         - Replaces element text with cached value from 'ujs:enable-with' data store (created in `disableFormElements`)
         - Sets disabled property to false
         */
        enableFormElements: function(form) {
            form.find(rails.enableSelector).each(function() {
                var element = $(this), method = element.is('button') ? 'html' : 'val';
                if (element.data('ujs:enable-with')) element[method](element.data('ujs:enable-with'));
                element.prop('disabled', false);
            });
        },

        /* For 'data-confirm' attribute:
         - Fires `confirm` event
         - Shows the confirmation dialog
         - Fires the `confirm:complete` event

         Returns `true` if no function stops the chain and user chose yes; `false` otherwise.
         Attaching a handler to the element's `confirm` event that returns a `falsy` value cancels the confirmation dialog.
         Attaching a handler to the element's `confirm:complete` event that returns a `falsy` value makes this function
         return false. The `confirm:complete` event is fired whether or not the user answered true or false to the dialog.
         */
        allowAction: function(element) {
            var message = element.data('confirm'),
                answer = false, callback;
            if (!message) { return true; }

            if (rails.fire(element, 'confirm')) {
                answer = rails.confirm(message);
                callback = rails.fire(element, 'confirm:complete', [answer]);
            }
            return answer && callback;
        },

        // Helper function which checks for blank inputs in a form that match the specified CSS selector
        blankInputs: function(form, specifiedSelector, nonBlank) {
            var inputs = $(), input,
                selector = specifiedSelector || 'input,textarea';
            form.find(selector).each(function() {
                input = $(this);
                // Collect non-blank inputs if nonBlank option is true, otherwise, collect blank inputs
                if (nonBlank ? input.val() : !input.val()) {
                    inputs = inputs.add(input);
                }
            });
            return inputs.length ? inputs : false;
        },

        // Helper function which checks for non-blank inputs in a form that match the specified CSS selector
        nonBlankInputs: function(form, specifiedSelector) {
            return rails.blankInputs(form, specifiedSelector, true); // true specifies nonBlank
        },

        // Helper function, needed to provide consistent behavior in IE
        stopEverything: function(e) {
            $(e.target).trigger('ujs:everythingStopped');
            e.stopImmediatePropagation();
            return false;
        },

        // find all the submit events directly bound to the form and
        // manually invoke them. If anyone returns false then stop the loop
        callFormSubmitBindings: function(form, event) {
            var events = form.data('events'), continuePropagation = true;
            if (events !== undefined && events['submit'] !== undefined) {
                $.each(events['submit'], function(i, obj){
                    if (typeof obj.handler === 'function') return continuePropagation = obj.handler(event);
                });
            }
            return continuePropagation;
        },

        //  replace element's html with the 'data-disable-with' after storing original html
        //  and prevent clicking on it
        disableElement: function(element) {
            element.data('ujs:enable-with', element.html()); // store enabled state
            element.html(element.data('disable-with')); // set to disabled state
            element.bind('click.railsDisable', function(e) { // prevent further clicking
                return rails.stopEverything(e)
            });
        },

        // restore element to its original state which was disabled by 'disableElement' above
        enableElement: function(element) {
            if (element.data('ujs:enable-with') !== undefined) {
                element.html(element.data('ujs:enable-with')); // set to old enabled state
                // this should be element.removeData('ujs:enable-with')
                // but, there is currently a bug in jquery which makes hyphenated data attributes not get removed
                element.data('ujs:enable-with', false); // clean up cache
            }
            element.unbind('click.railsDisable'); // enable element
        }

    };

    $.ajaxPrefilter(function(options, originalOptions, xhr){ if ( !options.crossDomain ) { rails.CSRFProtection(xhr); }});

    $(document).delegate(rails.linkDisableSelector, 'ajax:complete', function() {
        rails.enableElement($(this));
    });

    $(document).delegate(rails.linkClickSelector, 'click.rails', function(e) {
        var link = $(this), method = link.data('method'), data = link.data('params');
        if (!rails.allowAction(link)) return rails.stopEverything(e);

        if (link.is(rails.linkDisableSelector)) rails.disableElement(link);

        if (link.data('remote') !== undefined) {
            if ( (e.metaKey || e.ctrlKey) && (!method || method === 'GET') && !data ) { return true; }

            if (rails.handleRemote(link) === false) { rails.enableElement(link); }
            return false;

        } else if (link.data('method')) {
            rails.handleMethod(link);
            return false;
        }
    });

    $(document).delegate(rails.inputChangeSelector, 'change.rails', function(e) {
        var link = $(this);
        if (!rails.allowAction(link)) return rails.stopEverything(e);

        rails.handleRemote(link);
        return false;
    });

    $(document).delegate(rails.formSubmitSelector, 'submit.rails', function(e) {
        var form = $(this),
            remote = form.data('remote') !== undefined,
            blankRequiredInputs = rails.blankInputs(form, rails.requiredInputSelector),
            nonBlankFileInputs = rails.nonBlankInputs(form, rails.fileInputSelector);

        if (!rails.allowAction(form)) return rails.stopEverything(e);

        // skip other logic when required values are missing or file upload is present
        if (blankRequiredInputs && form.attr("novalidate") == undefined && rails.fire(form, 'ajax:aborted:required', [blankRequiredInputs])) {
            return rails.stopEverything(e);
        }

        if (remote) {
            if (nonBlankFileInputs) {
                return rails.fire(form, 'ajax:aborted:file', [nonBlankFileInputs]);
            }

            // If browser does not support submit bubbling, then this live-binding will be called before direct
            // bindings. Therefore, we should directly call any direct bindings before remotely submitting form.
            if (!$.support.submitBubbles && $().jquery < '1.7' && rails.callFormSubmitBindings(form, e) === false) return rails.stopEverything(e);

            rails.handleRemote(form);
            return false;

        } else {
            // slight timeout so that the submit button gets properly serialized
            setTimeout(function(){ rails.disableFormElements(form); }, 13);
        }
    });

    $(document).delegate(rails.formInputClickSelector, 'click.rails', function(event) {
        var button = $(this);

        if (!rails.allowAction(button)) return rails.stopEverything(event);

        // register the pressed submit button
        var name = button.attr('name'),
            data = name ? {name:name, value:button.val()} : null;

        button.closest('form').data('ujs:submit-button', data);
    });

    $(document).delegate(rails.formSubmitSelector, 'ajax:beforeSend.rails', function(event) {
        if (this == event.target) rails.disableFormElements($(this));
    });

    $(document).delegate(rails.formSubmitSelector, 'ajax:complete.rails', function(event) {
        if (this == event.target) rails.enableFormElements($(this));
    });

})( jQuery );

Array.prototype.max = Array.prototype.max || function() { return Math.max.apply(null, this); };
Array.prototype.min = Array.prototype.min || function() { return Math.min.apply(null, this); };

(function($){


    $.carousel = function(elem, options){

        // hide all i>0 images
        elem.find(options.img_selector).hide();

        // set up local references
        var images = elem.find(options.img_selector),
            current_index = null,
            pid = null,
            next_a = null,
            prev_a = null;

        images.each(function(i, img){
            var $img = $(img);
            if($img.data('url')){
                var alt = $img.data('alt') || '';
                $img.append('<img src="' + $img.data('url') + '" title="' + alt + '" alt="' + alt + '" />');
                (new Image()).href = $img.data('url');
            }
        });

        var next_index = function(){ return [current_index + 1, (current_index + 1 == images.length && options.loop ? 0 : images.length - 1)].min(); };
        var prev_index = function(){ return [current_index - 1, (current_index - 1 == -1 && options.loop ? images.length - 1 : 0)].max() };

        var go_to = function(idx){

            if(current_index == idx) return;
            if(current_index != null){
                $(images[current_index]).fadeOut(options.fade_time);
            }

            var f = function(){
                $(images[current_index = idx]).fadeIn(options.fade_time);
                if(!options.loop && options.navigation){
                    current_index == images.length - 1 ? next_a.addClass('off') : next_a.removeClass('off');
                    current_index == 0 ? prev_a.addClass('off') : prev_a.removeClass('off');
                }
            };
            setTimeout(f, options.delay);
            return false;
        };

        var next = function(){ return go_to(next_index()); };
        var prev = function(){ stop(); return go_to(prev_index()); };
        var stop = function(){ if(pid){ clearInterval(pid); pid = null; } };

        // add navigation if required
        if(options.navigation){
            elem.append(prev_a = $('<a href="#" class="prev">\u00AB</a>').click(prev));
            elem.append(next_a = $('<a href="#" class="next">\u00BB</a>').click(function(){stop(); return next();}));
        }


        go_to(options.start_index);

        return {
            next : next,
            prev : prev,
            play : function(){
                if(pid)
                    stop();
                pid = setInterval(next, options.page_time);
            },
            stop : stop
        }
    }

    $.fn.carousel = function(method){

        if(this.data('carousel') && this.data('carousel')[method]){
            return this.data('carousel')[method](Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method){
            var options = $.extend({
                navigation : false,
                auto : true,
                fade_time : 500,
                delay : 0,
                page_time : 5000,
                img_selector : '.img',
                loop : true,
                start_index : 0
            }, method)

            return this.data('carousel', $.carousel($(this), options));
        } else {
            $.error('jQuery.carousel does not support ' + method + ' or the carousel has not been initialized.')
        }

    };

    window.showContact = function(){
        $('#wrapper').animate({opacity : 0.2}, 200, function(){

            $('#contact').show(500, function(){
                var d = 0;
                var dur = 60;
                $('#contact li').each(function(i, el){
                    setTimeout(function(){ $(el).animate({'font-size' : 25}, dur); }, d);
                    d += dur;
                    setTimeout(function(){ $(el).animate({'font-size' : 20}, dur); }, d);
                    d += dur / 2;
                });
            });
        });
    };

    window.hideContact = function(){
        $('#contact').hide(200, function(){
            $('#wrapper').animate({opacity : 1.0}, 200);
        });
    };

    $(function(){
        $('#nav li:not(.contact) a').click(function(){
            $('html,body').animate({scrollTop : $('#' + this.href.split('#')[1]).offset().top});
            return false;
        });

        $('.contact a').click(showContact);

        if(navigator.userAgent.match(/iPhone|iPod|iPad/i) && !navigator.userAgent.match(/OS 5/i)) {
            var f = function(){ $('#footer').animate({top : (window.innerHeight + window.scrollY - $('#footer').height()) + 'px'}); };
            $(function(){ $('#footer').css({'position' : 'absolute', 'bottom' : 'auto'}); f();});
            $(window).scroll(f);
        }

        $('#more').click(function(){
            $('.more').toggleClass('active');
            return false;
        });
    });
}(jQuery))


window.routing = (function($){
    var routes
    return {
        draw : function(name, format, defaults){
            routes[name] = {format : format, defaults : defaults};
            window.routing[name + '_url'] = function(params){ return window.routing.build(name, params); };
            return routes[name];
        },
        build : function(name, params){
            var u = routes[name] && routes[name].format;
            if(!u) return null;
            params = $.extend({}, routes[name].defaults || {}, params || {});
            for(k in params){
                if(u.indexOf(':' + k) >= 0){
                    u = u.replace(':' + k + '', params[k]);
                    delete params[k];
                }
            }
            return u + (u.indexOf('?') > 0 ? '&' : '?') + $.param(params);
        }
    }
})(jQuery)