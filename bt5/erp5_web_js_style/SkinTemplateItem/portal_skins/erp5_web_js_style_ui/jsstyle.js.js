/*globals window, document, RSVP, rJS, XMLHttpRequest, DOMParser, URL,
          history, console */
/*jslint indent: 2, maxlen: 80*/
(function (window, document, RSVP, rJS, XMLHttpRequest, DOMParser, URL,
          loopEventListener, history, console) {
  "use strict";

  // XXX Copy/paste from renderjs
  function ajax(url) {
    var xhr;
    function resolver(resolve, reject) {
      function handler() {
        try {
          if (xhr.readyState === 0) {
            // UNSENT
            reject(xhr);
          } else if (xhr.readyState === 4) {
            // DONE
            if ((xhr.status < 200) || (xhr.status >= 300) ||
                (!/^text\/html[;]?/.test(
                  xhr.getResponseHeader("Content-Type") || ""
                ))) {
              reject(xhr);
            } else {
              resolve(xhr);
            }
          }
        } catch (e) {
          reject(e);
        }
      }

      xhr = new XMLHttpRequest();
      xhr.open("GET", url);
      xhr.onreadystatechange = handler;
      xhr.setRequestHeader('Accept', 'text/html');
      xhr.withCredentials = true;
      xhr.send();
    }
    function canceller() {
      if ((xhr !== undefined) && (xhr.readyState !== xhr.DONE)) {
        xhr.abort();
      }
    }
    return new RSVP.Promise(resolver, canceller);
  }

  function removeHash(url) {
    var index = url.indexOf('#');
    if (index > 0) {
      url = url.substring(0, index);
    }
    return url;
  }

  function scrollToHash(hash) {
    var scroll_element = null;

    if (hash) {
      hash = hash.split('#', 2)[1];
      if (hash === undefined) {
        hash = "";
      }
      if (hash) {
        scroll_element = document.querySelector(hash);
      }
    }

    if (scroll_element === null) {
      window.scrollTo(0, 0);
    } else {
      scroll_element.scrollIntoView(true);
    }

  }

  function parseLanguageElement(language_element) {
    var language_list = [],
      li_list = language_element.querySelectorAll('a'),
      i;
    for (i = 0; i < li_list.length; i += 1) {
      language_list.push({
        href: li_list[i].href,
        text: li_list[i].hreflang
      });
    }
    return language_list;
  }

  function parseSitemapElement(sitemap_element) {
    var a = sitemap_element.querySelector('a'),
      sitemap = {
        href: a.href,
        text: a.textContent,
        child_list: []
      },
      ul = a.nextElementSibling,
      li_list,
      i;

    if (ul === null) {
      li_list = [];
    } else {
      li_list = ul.children;
    }
    for (i = 0; i < li_list.length; i += 1) {
      sitemap.child_list.push(parseSitemapElement(li_list[i]));
    }
    return sitemap;
  }

  function parseDocumentListElement(document_list_element) {
    var document_list = [],
      li_list,
      i;
    if (document_list_element === null) {
      return document_list;
    }

    li_list = document_list_element.querySelectorAll('a');
    for (i = 0; i < li_list.length; i += 1) {
      document_list.push({
        href: li_list[i].href,
        text: li_list[i].textContent
      });
    }
    return document_list;
  }

  function parseFormElement(form_element) {
    if (form_element !== null) {
      return form_element.outerHTML;
    }
    return;
  }

  function parseStatusMessage(status_element, information_element) {
    var result = "";
    if (status_element !== null) {
      result = status_element.textContent;
    }
    if (information_element !== null) {
      result = information_element.textContent;
    }
    return result;
  }

  function parsePageContent(body_element, base_uri) {
    var i,
      element,
      element_list,
      j,
      url_attribute_list = ['src', 'href', 'srcset', 'action'],
      url_attribute;

    if (base_uri !== undefined) {
      // Rewrite relative url (copied from renderjs)
      for (j = 0; j < url_attribute_list.length; j += 1) {
        url_attribute = url_attribute_list[j];
        element_list = body_element.querySelectorAll(
          '[' + url_attribute + ']'
        );
        for (i = 0; i < element_list.length; i += 1) {
          element = element_list[i];
          element.setAttribute(url_attribute, new URL(
            element.getAttribute(url_attribute),
            base_uri
          ).href);
        }
      }

    }

    return {
      original_content: body_element.innerHTML,
      html_content: body_element.querySelector('main').innerHTML,
      language_list: parseLanguageElement(
        body_element.querySelector('nav#language')
      ),
      sitemap: parseSitemapElement(
        body_element.querySelector('nav#sitemap')
      ),
      document_list: parseDocumentListElement(
        body_element.querySelector('aside#document_list')
      ),
      form_html_content: parseFormElement(
        body_element.querySelector('form#main_form')
      ),
      portal_status_message: parseStatusMessage(
        body_element.querySelector('p#portal_status_message'),
        body_element.querySelector('p#information_area')
      )
    };
  }

  function renderPage(gadget, page_url, hash) {
    return new RSVP.Queue(RSVP.hash({
      xhr: ajax(page_url),
      style_gadget: gadget.getDeclaredGadget('renderer')
    }))
      .push(function (result_dict) {
        var dom_parser = (new DOMParser()).parseFromString(
          result_dict.xhr.responseText,
          'text/html'
        ),
          parsed_content;
        if (gadget.style_gadget_url !== new URL(
            dom_parser.body
                      .getAttribute("data-nostyle-gadget-url"),
            dom_parser.baseURI
          ).href
            ) {
          // If the HTML is not supposed to be rendered
          // with the same js style gadget,
          // consider this must be reloaded
          throw new Error('Trigger an error to force reload');
        }
        parsed_content = parsePageContent(dom_parser.body, dom_parser.baseURI);
        gadget.parsed_content = parsed_content;
        parsed_content.page_title = dom_parser.title;
        return result_dict.style_gadget.render(parsed_content.html_content,
                                               parsed_content);
      })
      .push(function () {
        return scrollToHash(hash);
      });
  }

  function listenURLChange() {
    var gadget = this;

    // prevent automatic page location restoration
    if (history.scrollRestoration) {
      history.scrollRestoration = 'manual';
    }

    function handlePopState() {
      return renderPage(gadget, window.location.href, window.location.hash);
    }

    function handleClick(evt) {
      var target_element = evt.target.closest('a'),
        base_uri = document.baseURI,
        link_url;

      if (!target_element) {
        // Only handle link
        return;
      }
      if (target_element.target === "_blank") {
        // Open in a new tab
        return;
      }
      if (evt.altKey || evt.ctrlKey || evt.metaKey || evt.shiftKey) {
        return;
      }
      link_url = new URL(target_element.href, base_uri);

      if (base_uri.indexOf(link_url.origin) !== 0) {
        // No need to query from another domain
        return;
      }

      if (link_url.hash) {
        // If new link has an hash, check if the path/query parts are identical
        // if so, do not refresh the content and
        // let browser scroll to the correct element
        if (removeHash(link_url.href) === removeHash(window.location.href)) {
          return;
        }
      }

      evt.preventDefault();
      return renderPage(gadget, target_element.href, link_url.hash)
        .push(function () {
          // Important: pushState must be called AFTER the page rendering
          // to ensure popstate listener is correctly working
          // when the user will click on back/forward browser buttons
          history.pushState(null, null, target_element.href);
        }, function (error) {
          console.warn('Cant render the page', error);
          // Implement support for managed error
          // (like URL is not an HTML document parsable)
          // and redirect in such case
          window.location = target_element.href;
        });
    }

    return RSVP.all([
      loopEventListener(window, 'popstate', false, handlePopState, false),
      loopEventListener(gadget.element, 'click', false, handleClick,
                        false)
    ]);
  }

  rJS(window)
    .allowPublicAcquisition("reportServiceError", function () {
      this.element.hidden = false;
      throw rJS.AcquisitionError();
    })
    .declareJob("listenURLChange", listenURLChange)
    .declareService(function () {
      var gadget = this,
        style_gadget,
        body = gadget.element,
        style_gadget_url = body.getAttribute("data-nostyle-gadget-url"),
        style_css_url = body.getAttribute("data-nostyle-css-url"),
        parsed_content;

      if (!style_gadget_url) {
        // No style configured, use backend only rendering
        return rJS.declareCSS(style_css_url, document.head);
      }

      parsed_content = parsePageContent(gadget.element);
      gadget.parsed_content = parsed_content;
      parsed_content.page_title = document.title;
      gadget.style_gadget_url =
        new URL(style_gadget_url, document.baseURI).href;
      // Clear the DOM
      while (body.firstChild) {
        body.firstChild.remove();
      }
      return gadget.declareGadget(style_gadget_url, {scope: 'renderer'})
        .push(function (result) {
          style_gadget = result;
          return style_gadget.render(parsed_content.html_content,
                                     parsed_content)
            .push(function () {
              // Trigger URL handling
              gadget.listenURLChange();

              body.appendChild(style_gadget.element);
              gadget.element.hidden = false;
              scrollToHash(window.location.hash);
            }, function (error) {
              gadget.element.hidden = false;
              throw error;
            });
        }, function (error) {
          console.warn('Cant load the style gadget', error);
          return new RSVP.Queue(rJS.declareCSS(style_css_url, document.head))
            .push(function () {
              // Set again the page content after the css is loaded
              // to prevent ugly rendering
              gadget.element.innerHTML = parsed_content.original_content;
            });
        });
    });

}(window, document, RSVP, rJS, XMLHttpRequest, DOMParser, URL,
  rJS.loopEventListener, history, console));