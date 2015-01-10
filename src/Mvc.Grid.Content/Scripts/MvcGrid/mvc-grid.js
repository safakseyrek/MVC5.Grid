﻿/*!
* Mvc.Grid 0.9.0
* https://github.com/NonFactors/MVC.Grid
*
* Copyright © NonFactors
*
* Licensed under the terms of the MIT License
* http://www.opensource.org/licenses/mit-license.php
*/
var MvcGrid = (function () {
    function MvcGrid(grid, options) {
        this.gridQuery = window.location.search.replace('?', '');
        this.dataSourceUrl = grid.data('source-url') || '';
        this.isAjax = this.dataSourceUrl != '';
        this.name = grid.data('name') || '';
        var opt = options || {};
        this.element = grid;
        this.columns = [];

        if (this.isAjax) {
            this.gridQuery = opt.query || '';
            if (opt.isLoaded != true) {
                this.reload(this.gridQuery);
                return;
            }
        }
        this.filters = opt.filters || {
            'Text': new MvcGridTextFilter(),
            'Date': new MvcGridDateFilter(),
            'Number': new MvcGridNumberFilter(),
            'Boolean': new MvcGridBooleanFilter()
        };

        var headers = grid.find('.mvc-grid-header');
        for (var i = 0; i < headers.length; i++) {
            var column = this.createColumn($(headers[i]));
            this.applyFiltering(column);
            this.applySorting(column);
            this.columns.push(column);
            this.cleanHeader(column);
        }

        var pages = grid.find('.mvc-grid-pager span');
        for (var ind = 0; ind < pages.length; ind++) {
            this.applyPaging($(pages[ind]));
        }

        this.rowClicked = opt.rowClicked;
        this.bindGridEvents();
        this.cleanGrid(grid);
    }

    MvcGrid.prototype = {
        createColumn: function (header) {
            return {
                name: header.data('name') || '',
                header: header,
                filter: {
                    isEnabled: header.data('filterable') == 'True',
                    name: header.data('filter-name') || '',
                    type: header.data('filter-type') || '',
                    val: header.data('filter-val') || ''
                },
                sort: {
                    isEnabled: header.data('sortable') == 'True',
                    firstOrder: header.data('sort-first') || '',
                    order: header.data('sort-order') || ''
                }
            };
        },
        set: function(options) {
            if (options.filters) {
                this.filters = options.filters;
            }
            if (options.rowClicked) {
                this.rowClicked = options.rowClicked;
            }
        },

        applyFiltering: function (column) {
            var grid = this;

            if (column.filter.isEnabled) {
                column.header.find('.mvc-grid-filter').bind('click.mvcgrid', function () {
                    grid.renderFilter(column);
                });
            }
        },
        applySorting: function (column) {
            var grid = this;

            if (column.sort.isEnabled) {
                column.header.bind('click.mvcgrid', function (e) {
                    var target = $(e.target || e.srcElement);
                    if (!target.hasClass('mvc-grid-filter') && target.parents('.mvc-grid-filter').length == 0) {
                        grid.reload(grid.formSortQuery(column));
                    }
                });
            }
        },
        applyPaging: function (pageElement) {
            var page = pageElement.data('page') || '';
            var grid = this;

            if (page != '') {
                pageElement.bind('click.mvcgrid', function () {
                    grid.reload(grid.formPageQuery(page));
                });
            }
        },

        reload: function (query) {
            var grid = this;

            if (grid.isAjax) {
                $.ajax({
                    url: grid.dataSourceUrl + '?' + query
                }).success(function (result) {
                    grid.element.hide();
                    grid.element.after(result);

                    grid.element.next('.mvc-grid').mvcgrid({
                        rowClicked: grid.rowClicked,
                        filters: grid.filters,
                        isLoaded: true,
                        query: query
                    });
                    grid.element.remove();
                });
            } else {
                window.location.href = '?' + query;
            }
        },
        renderFilter: function (column) {
            var popup = $('body').children('.mvc-grid-filter-popup');
            var gridFilter = this.filters[column.filter.name];

            if (gridFilter) {
                gridFilter.render(popup, column.filter);
                gridFilter.init(this, column, popup);

                this.setFilterPosition(column, popup);
                popup.addClass('open');

                $(window).bind('click.mvcgrid', function (e) {
                    var target = $(e.target || e.srcElement);
                    if (!target.hasClass('mvc-grid-filter') && target.parents('.mvc-grid-filter-popup').length == 0) {
                        $(window).unbind('click.mvcgrid');
                        popup.removeClass('open');
                    }
                });
            } else {
                $(window).unbind('click.mvcgrid');
                popup.removeClass('open');
            }
        },
        setFilterPosition: function (column, popup) {
            var filter = column.header.find('.mvc-grid-filter');
            var arrow = popup.find('.popup-arrow');
            var filterLeft = filter.offset().left;
            var filterTop = filter.offset().top;
            var filterHeight = filter.height();
            var winWidth = $(window).width();
            var popupWidth = popup.width();

            var popupTop = filterTop + filterHeight / 2 + 14;
            var popupLeft = filterLeft - 8;
            var arrowLeft = 15;

            if (filterLeft + popupWidth + 5 > winWidth) {
                popupLeft = winWidth - popupWidth - 14;
                arrowLeft = filterLeft - popupLeft + 7;
            }

            arrow.css('left', arrowLeft + 'px');
            popup.css('left', popupLeft + 'px');
            popup.css('top', popupTop + 'px');
        },

        formFilterQuery: function (column) {
            var key = encodeURIComponent(this.name + '-' + column.name + '-' + column.filter.type);
            var columnKey = encodeURIComponent(this.name + '-' + column.name);
            var value = encodeURIComponent(column.filter.val);
            var params = this.gridQuery.split('&');
            var paramExists = false;
            var newParams = [];

            for (var i = 0; i < params.length; i++) {
                if (params[i] !== '') {
                    var paramKey = params[i].split('=')[0];
                    if (paramKey.indexOf(columnKey) == 0) {
                        params[i] = key + '=' + value;
                        paramExists = true;
                    }

                    newParams.push(params[i]);
                }
            }
            if (!paramExists) {
                newParams.push(key + '=' + value);
            }

            return newParams.join('&');
        },
        formFilterQueryWithout: function (column) {
            var key = encodeURIComponent(this.name + '-' + column.name + '-' + column.filter.type);
            var params = this.gridQuery.split('&');
            var newParams = [];

            for (var i = 0; i < params.length; i++) {
                if (params[i] != '' && params[i].indexOf(key) != 0) {
                    newParams.push(params[i]);
                }
            }

            return newParams.join('&');
        },
        formSortQuery: function (column) {
            var sortQuery = this.addOrReplace(this.gridQuery, this.name + '-Sort', column.name);
            var order = column.sort.order == 'Asc' ? 'Desc' : 'Asc';
            if (column.sort.order == '' && column.sort.firstOrder != '') {
                order = column.sort.firstOrder;
            }

            return this.addOrReplace(sortQuery, this.name + '-Order', order);
        },
        formPageQuery: function (page) {
            return this.addOrReplace(this.gridQuery, this.name + '-Page', page);
        },
        addOrReplace: function (query, key, value) {
            value = encodeURIComponent(value);
            key = encodeURIComponent(key);
            var params = query.split('&');
            var paramExists = false;
            var newParams = [];

            for (var i = 0; i < params.length; i++) {
                if (params[i] !== '') {
                    var paramKey = params[i].split('=')[0];
                    if (paramKey == key) {
                        params[i] = key + '=' + value;
                        paramExists = true;
                    }

                    newParams.push(params[i]);
                }
            }
            if (!paramExists) {
                newParams.push(key + '=' + value);
            }

            return newParams.join('&');
        },

        bindGridEvents: function () {
            var grid = this;
            this.element.find('.mvc-grid-row').bind('click.mvcgrid', function () {
                if (grid.rowClicked) {
                    var cells = $(this).find('td');
                    var row = [];

                    for (var ind = 0; ind < grid.columns.length; ind++) {
                        var column = grid.columns[ind];
                        if (cells.length > ind) {
                            row[column.name] = $(cells[ind]).text();
                        }
                    }

                    grid.rowClicked(grid, row);
                }
            });
        },

        cleanHeader: function (column) {
            var header = column.header;
            header.removeAttr('data-name');

            header.removeAttr('data-filterable');
            header.removeAttr('data-filter-name');
            header.removeAttr('data-filter-type');
            header.removeAttr('data-filter-val');

            header.removeAttr('data-sortable');
            header.removeAttr('data-sort-order');
            header.removeAttr('data-sort-first');
        },
        cleanGrid: function (grid) {
            grid.removeAttr('data-source-url');
            grid.removeAttr('data-name');
        }
    };

    return MvcGrid;
})();

var MvcGridTextFilter = (function () {
    function MvcGridTextFilter() {
    }

    MvcGridTextFilter.prototype = {
        render: function (popup, filter) {
            var lang = $.fn.mvcgrid.lang.Text;

            popup.html(
                '<div class="popup-arrow"></div>' +
                '<div class="popup-content">' +
                    '<div class="form-group">' +
                        '<select class="mvc-grid-filter-type form-control">' +
                            '<option value="Contains"' + (filter.type == 'Contains' ? ' selected="selected"' : '') + '>' + lang.Contains + '</option>' + '<option value="Equals"' + (filter.type == 'Equals' ? ' selected="selected"' : '') + '>' + lang.Equals + '</option>' + '<option value="StartsWith"' + (filter.type == 'StartsWith' ? ' selected="selected"' : '') + '>' + lang.StartsWith + '</option>' + '<option value="EndsWith"' + (filter.type == 'EndsWith' ? ' selected="selected"' : '') + '>' + lang.EndsWith + '</option>' +
                        '</select>' +
                     '</div>' +
                     '<div class="form-group">' +
                        '<input class="form-control mvc-grid-input" type="text" value="' + filter.val + '">' +
                     '</div>' +
                     '<div class="mvc-grid-filter-buttons row">' +
                        '<div class="mvc-grid-left-button col-sm-6">' +
                            '<button class="btn btn-success btn-block mvc-grid-filter-apply" type="button">&#10004;</button>' +
                        '</div>' +
                        '<div class="mvc-grid-right-button col-sm-6">' +
                            '<button class="btn btn-danger btn-block mvc-grid-filter-cancel" type="button">&#10008;</button>' +
                        '</div>' +
                     '</div>' +
                 '</div>');
        },

        init: function (grid, column, popup) {
            this.bindType(grid, column, popup);
            this.bindValue(grid, column, popup);
            this.bindApply(grid, column, popup);
            this.bindCancel(grid, column, popup);
        },
        bindType: function (grid, column, popup) {
            var type = popup.find('.mvc-grid-filter-type');
            type.bind('change.mvcgrid', function () {
                column.filter.type = this.value;
            });
            type.change();
        },
        bindValue: function (grid, column, popup) {
            var value = popup.find('.mvc-grid-input');
            value.bind('keyup.mvcgrid', function (e) {
                column.filter.val = this.value;
                if (e.keyCode == 13) {
                    popup.find('.mvc-grid-filter-apply').click();
                }
            });
        },
        bindApply: function (grid, column, popup) {
            var apply = popup.find('.mvc-grid-filter-apply');
            apply.bind('click.mvcgrid', function () {
                popup.removeClass('open');
                grid.reload(grid.formFilterQuery(column));
            });
        },
        bindCancel: function (grid, column, popup) {
            var cancel = popup.find('.mvc-grid-filter-cancel');
            cancel.bind('click.mvcgrid', function () {
                popup.removeClass('open');
                grid.reload(grid.formFilterQueryWithout(column));
            });
        }
    };

    return MvcGridTextFilter;
})();

var MvcGridNumberFilter = (function () {
    function MvcGridNumberFilter() {
    }

    MvcGridNumberFilter.prototype = {
        render: function (popup, filter) {
            var lang = $.fn.mvcgrid.lang.Number;

            popup.html(
                '<div class="popup-arrow"></div>' +
                '<div class="popup-content">' +
                    '<div class="form-group">' +
                        '<select class="mvc-grid-filter-type form-control">' +
                            '<option value="Equals"' + (filter.type == 'Equals' ? ' selected="selected"' : '') + '>' + lang.Equals + '</option>' +
                            '<option value="LessThan"' + (filter.type == 'LessThan' ? ' selected="selected"' : '') + '>' + lang.LessThan + '</option>' +
                            '<option value="GreaterThan"' + (filter.type == 'GreaterThan' ? ' selected="selected"' : '') + '>' + lang.GreaterThan + '</option>' +
                            '<option value="LessThanOrEqual"' + (filter.type == 'LessThanOrEqual' ? ' selected="selected"' : '') + '>' + lang.LessThanOrEqual + '</option>' +
                            '<option value="GreaterThanOrEqual"' + (filter.type == 'GreaterThanOrEqual' ? ' selected="selected"' : '') + '>' + lang.GreaterThanOrEqual + '</option>' +
                        '</select>' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<input class="form-control mvc-grid-input" type="text" value="' + filter.val + '">' +
                    '</div>' +
                    '<div class="mvc-grid-filter-buttons row">' +
                        '<div class="mvc-grid-left-button col-sm-6">' +
                            '<button class="btn btn-success btn-block mvc-grid-filter-apply" type="button">&#10004;</button>' +
                        '</div>' + '<div class="mvc-grid-right-button col-sm-6">' +
                            '<button class="btn btn-danger btn-block mvc-grid-filter-cancel" type="button">&#10008;</button>' +
                        '</div>' +
                    '</div>' +
                '</div>');
        },

        init: function (grid, column, popup) {
            this.bindType(grid, column, popup);
            this.bindValue(grid, column, popup);
            this.bindApply(grid, column, popup);
            this.bindCancel(grid, column, popup);
        },
        bindType: function (grid, column, popup) {
            var type = popup.find('.mvc-grid-filter-type');
            type.bind('change.mvcgrid', function () {
                column.filter.type = this.value;
            });
            type.change();
        },
        bindValue: function (grid, column, popup) {
            var value = popup.find('.mvc-grid-input');
            var filter = this;

            value.bind('keyup.mvcgrid', function (e) {
                column.filter.val = this.value;
                if (filter.isValid(this.value)) {
                    $(this).removeClass('invalid');
                    if (e.keyCode == 13) {
                        popup.find('.mvc-grid-filter-apply').click();
                    }
                } else {
                    $(this).addClass('invalid');
                }
            });

            if (!filter.isValid(column.filter.val)) {
                value.addClass('invalid');
            }
        },
        bindApply: function (grid, column, popup) {
            var apply = popup.find('.mvc-grid-filter-apply');
            apply.bind('click.mvcgrid', function () {
                popup.removeClass('open');
                grid.reload(grid.formFilterQuery(column));
            });
        },
        bindCancel: function (grid, column, popup) {
            var cancel = popup.find('.mvc-grid-filter-cancel');
            cancel.bind('click.mvcgrid', function () {
                popup.removeClass('open');
                grid.reload(grid.formFilterQueryWithout(column));
            });
        },

        isValid: function (value) {
            var pattern = new RegExp('^(?=.*\\d+.*)[-+]?\\d*[.,]?\\d*$');

            return pattern.test(value);
        }
    };

    return MvcGridNumberFilter;
})();

var MvcGridDateFilter = (function () {
    function MvcGridDateFilter() {
    }

    MvcGridDateFilter.prototype = {
        render: function (popup, filter) {
            var filterInput = '<input class="form-control mvc-grid-input" type="text" value="' + filter.val + '">';
            var lang = $.fn.mvcgrid.lang.Date;

            popup.html(
                '<div class="popup-arrow"></div>' +
                '<div class="popup-content">' +
                    '<div class="form-group">' +
                        '<select class="mvc-grid-filter-type form-control">' +
                            '<option value="Equals"' + (filter.type == 'Equals' ? ' selected="selected"' : '') + '>' + lang.Equals + '</option>' +
                            '<option value="LessThan"' + (filter.type == 'LessThan' ? ' selected="selected"' : '') + '>' + lang.LessThan + '</option>' +
                            '<option value="GreaterThan"' + (filter.type == 'GreaterThan' ? ' selected="selected"' : '') + '>' + lang.GreaterThan + '</option>' +
                            '<option value="LessThanOrEqual"' + (filter.type == 'LessThanOrEqual' ? ' selected="selected"' : '') + '>' + lang.LessThanOrEqual + '</option>' +
                            '<option value="GreaterThanOrEqual"' + (filter.type == 'GreaterThanOrEqual' ? ' selected="selected"' : '') + '>' + lang.GreaterThanOrEqual + '</option>' +
                        '</select>' +
                    '</div>' +
                    '<div class="form-group">' +
                        filterInput +
                    '</div>' +
                    '<div class="mvc-grid-filter-buttons row">' +
                        '<div class="mvc-grid-left-button col-sm-6">' +
                            '<button class="btn btn-success btn-block mvc-grid-filter-apply" type="button">&#10004;</button>' +
                        '</div>' +
                        '<div class="mvc-grid-right-button col-sm-6">' +
                            '<button class="btn btn-danger btn-block mvc-grid-filter-cancel" type="button">&#10008;</button>' +
                        '</div>' +
                    '</div>' +
                '</div>');
        },

        init: function (grid, column, popup) {
            this.bindType(grid, column, popup);
            this.bindValue(grid, column, popup);
            this.bindApply(grid, column, popup);
            this.bindCancel(grid, column, popup);
        },
        bindType: function (grid, column, popup) {
            var type = popup.find('.mvc-grid-filter-type');
            type.bind('change.mvcgrid', function () {
                column.filter.type = this.value;
            });
            type.change();
        },
        bindValue: function (grid, column, popup) {
            var value = popup.find('.mvc-grid-input');
            if ($.fn.datepicker) {
                value.datepicker();
            }

            value.bind('change.mvcgrid keyup.mvcgrid', function (e) {
                column.filter.val = this.value;
                if (e.keyCode == 13) {
                    popup.find('.mvc-grid-filter-apply').click();
                }
            });
        },
        bindApply: function (grid, column, popup) {
            var apply = popup.find('.mvc-grid-filter-apply');
            apply.bind('click.mvcgrid', function () {
                popup.removeClass('open');
                grid.reload(grid.formFilterQuery(column));
            });
        },
        bindCancel: function (grid, column, popup) {
            var cancel = popup.find('.mvc-grid-filter-cancel');
            cancel.bind('click.mvcgrid', function () {
                popup.removeClass('open');
                grid.reload(grid.formFilterQueryWithout(column));
            });
        }
    };

    return MvcGridDateFilter;
})();

var MvcGridBooleanFilter = (function () {
    function MvcGridBooleanFilter() {
    }

    MvcGridBooleanFilter.prototype = {
        render: function (popup, filter) {
            var lang = $.fn.mvcgrid.lang.Boolean;

            popup.html(
                '<div class="popup-arrow"></div>' +
                '<div class="popup-content">' +
                    '<div class="form-group">' +
                        '<ul class="mvc-grid-filter-values mvc-grid-boolean-filter">' +
                            '<li ' + (filter.val == 'True' ? 'class="active" ' : '') + 'data-value="True">' + lang.Yes + '</li>' +
                            '<li ' + (filter.val == 'False' ? 'class="active" ' : '') + 'data-value="False">' + lang.No + '</li>' +
                        '</ul>' +
                    '</div>' +
                    '<div class="mvc-grid-filter-buttons row">' +
                        '<div class="mvc-grid-left-button col-sm-6">' +
                            '<button class="btn btn-success btn-block mvc-grid-filter-apply" type="button">&#10004;</button>' +
                        '</div>' +
                        '<div class="mvc-grid-right-button col-sm-6">' +
                            '<button class="btn btn-danger btn-block mvc-grid-filter-cancel" type="button">&#10008;</button>' +
                        '</div>' +
                    '</div>' +
                '</div>');
        },

        init: function (grid, column, popup) {
            this.bindValue(grid, column, popup);
            this.bindApply(grid, column, popup);
            this.bindCancel(grid, column, popup);
        },
        bindValue: function (grid, column, popup) {
            var values = popup.find('.mvc-grid-filter-values li');
            column.filter.type = 'Equals';

            values.bind('click.mvcgrid', function () {
                var item = $(this);

                column.filter.val = item.data('value');
                item.siblings().removeClass('active');
                item.addClass('active');
            });
        },
        bindApply: function (grid, column, popup) {
            var apply = popup.find('.mvc-grid-filter-apply');
            apply.bind('click.mvcgrid', function () {
                popup.removeClass('open');
                grid.reload(grid.formFilterQuery(column));
            });
        },
        bindCancel: function (grid, column, popup) {
            var cancel = popup.find('.mvc-grid-filter-cancel');
            cancel.bind('click.mvcgrid', function () {
                popup.removeClass('open');
                grid.reload(grid.formFilterQueryWithout(column));
            });
        }
    };;

    return MvcGridBooleanFilter;
})();

$.fn.mvcgrid = function (options) {
    return this.each(function () {
        if (!$.data(this, 'mvc-grid')) {
            $.data(this, 'mvc-grid', new MvcGrid($(this), options));
        } else if (options) {
            $.data(this, 'mvc-grid').set(options);
        }
    });
};
$.fn.mvcgrid.lang = {
    Text: {
        Contains: 'Contains',
        Equals: 'Equals',
        StartsWith: 'Starts with',
        EndsWith: 'Ends with'
    },
    Number: {
        Equals: 'Equals',
        LessThan: 'Less than',
        GreaterThan: 'Greater than',
        LessThanOrEqual: 'Less than or equal',
        GreaterThanOrEqual: 'Greater than or equal'
    },
    Date: {
        Equals: 'Equals',
        LessThan: 'Less than',
        GreaterThan: 'Greater than',
        LessThanOrEqual: 'Less than or equal',
        GreaterThanOrEqual: 'Greater than or equal'
    },
    Boolean: {
        Yes: 'Yes',
        No: 'No'
    }
};
$(function () {
    $('body').append('<div class="mvc-grid-filter-popup dropdown-menu"></div>');
    $(window).resize(function () {
        $('.mvc-grid-filter-popup').removeClass('open');
    });
    $('.mvc-grid').mvcgrid();
});
