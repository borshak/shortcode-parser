/* Changed for using in browser, without Node.js
Function util.format() from Node.js was changed to sprintf.js
Modified by: Alexander Borshak
*/

(function(window) {
  var shortcode = {
    
    shortcodes: {},

    ATTRS: /(\s+([a-z0-9\-_]+|([a-z0-9\-_]+)\s*=\s*([a-z0-9\-_]+|\d+\.\d+|'[^']*'|"[^"]*")))*/.toString().slice(1,-1),
    SLASH: /\s*\/?\s*/.toString().slice(1,-1),
    OPEN: /\[\s*%s/.toString().slice(1,-1),
    RIGHT_BRACKET: '\\]',
    CLOSE: /\[\s*\/\s*%s\s*\]/.toString().slice(1,-1),
    CONTENT: /(.|\n|)*?/.toString().slice(1,-1),
    SPACE: /\s*/.toString().slice(1,-1),

    typecast: function(val) {
      val = val.trim().replace(/(^['"]|['"]$)/g, '');
      if (/^\d+$/.test(val)) {
        return parseInt(val, 10);
      } else if (/^\d+\.\d+$/.test(val)) {
        return parseFloat(val);
      } else if (/^(true|false)$/.test(val)) {
        return (val === 'true');
      } else if (/^undefined$/.test(val)) {
        return undefined;
      } else if (/^null$/i.test(val)) {
        return null;
      } else {
        return val;
      }
    },

    closeTagString: function(name) {
      return /^[^a-z0-9]/.test(name) ? sprintf('[%s]?%s', name[0].replace('$', '\\$'), name.slice(1)) : name;
    },

    parseShortcode: function(name, buf, inline) {
      
      var regex, match, data = {}, attr = {};
      
      if (inline) {
        regex = new RegExp('^' + sprintf(this.OPEN, name)
        + this.ATTRS
        + this.SPACE
        + this.SLASH
        + this.RIGHT_BRACKET, 'i');
      } else {
        regex = new RegExp('^' + sprintf(this.OPEN, name)
        + this.ATTRS
        + this.SPACE
        + this.RIGHT_BRACKET, 'i');
      }
      
      while ((match = buf.match(regex)) !== null) {
        var key = match[3] || match[2];
        var val = match[4] || match[3];
        var pattern = match[1];
        if (pattern) {
          var idx = buf.lastIndexOf(pattern);
          attr[key] = (val !== undefined) ? this.typecast(val) : true;
          buf = buf.slice(0, idx) + buf.slice(idx + pattern.length);
        } else {
          break;
        }
      }
      
      attr = Object.keys(attr).reverse().reduce(function(prev, current) {
        prev[current] = attr[current]; return prev;
      }, {});
      
      buf = buf.replace(regex, '').replace(new RegExp(sprintf(this.CLOSE, this.closeTagString(name))), '');

      return {
        attr: attr,
        content: inline ? buf : buf.replace(/(^\n|\n$)/g, '')
      }

    },
    
    add: function (name, callback) {
      if (typeof name == 'object') {
        var ob = name;
        for (var m in ob) { // Adding methods from instance and prototype
          if (ob[m] instanceof Function) {
            this.shortcodes[m] = ob[m];
          }
        }
      } else {
        this.shortcodes[name] = callback;
      }
    },
    
    remove: function(name) {
      delete this.shortcodes[name];
    },
    
    parse: function(buf, extra, context) {
      
      context = context || this.shortcodes;

      extra = extra || {};
      
      for (var name in context) {

        // Allow absence of first char if not alpha numeric. E.g. [#shortcode]...[/shortcode]
        
        var regex = {
          wrapper: new RegExp(sprintf(this.OPEN, name)
          + this.ATTRS
          + this.RIGHT_BRACKET
          + this.CONTENT
          + sprintf(this.CLOSE, this.closeTagString(name)), 'gi'),
          inline: new RegExp(sprintf(this.OPEN, name)
          + this.ATTRS
          + this.SLASH
          + this.RIGHT_BRACKET, 'gi')
        }
        
        var matches = buf.match(regex.wrapper);
      
        if (matches) {
          for (var m,data,i=0,len=matches.length; i < len; i++) {
            m = matches[i];
            data = this.parseShortcode(name, m);
            buf = buf.replace(m, context[name].call(null, data.content, data.attr, extra));
          }
        }

        matches = buf.match(regex.inline);
        
        if (matches) {
        
          while((m = matches.shift()) !== undefined) {
            data = this.parseShortcode(name, m, true);
            buf = buf.replace(m, context[name].call(null, data.content, data.attr, extra));
          }

        }
        
      }
    
      return buf;
    
    },
    
    parseInContext: function(buf, context, data) {
      return this.parse(buf, data, context);
    }
    
  }
  
  /**
   * export to either browser or node.js
   */
  if (typeof exports !== 'undefined') {
      exports.shortcode = shortcode;
  }
  else {
      window.shortcode = shortcode;

      if (typeof define === 'function' && define.amd) {
          define(function() {
              return {
                  shortcode: shortcode
              }
          })
      }
  }

})(typeof window === 'undefined' ? this : window);
