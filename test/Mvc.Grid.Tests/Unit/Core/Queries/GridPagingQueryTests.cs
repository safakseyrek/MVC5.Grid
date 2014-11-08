﻿using NSubstitute;
using NUnit.Framework;
using System;
using System.Collections.Specialized;
using System.Web;

namespace NonFactors.Mvc.Grid.Tests.Unit
{
    [TestFixture]
    public class GridPagingQueryTests
    {
        #region Constructor: GridPagingQuery(IGridQuery query)

        [Test]
        [TestCase("", "Page=1", 0)]
        [TestCase("", "MG-Page=", 0)]
        [TestCase("", "MG-Page=5", 5)]
        [TestCase(null, "Page=1", 0)]
        [TestCase(null, "MG-Page=", 0)]
        [TestCase(null, "MG-Page=1", 1)]
        [TestCase("  ", "Page=1", 0)]
        [TestCase("  ", "MG-Page-  =", 0)]
        [TestCase("  ", "MG-Page-  =5", 5)]
        [TestCase("Grid", "MG-Page=1", 0)]
        [TestCase("Grid", "MG-Page-Grid=", 0)]
        [TestCase("Grid", "MG-Page-Grid=10", 10)]
        public void GridSortingQuery_SetsCurrentPage(String gridName, String query, Int32 currentPage)
        {
            IGridQuery gridQuery = Substitute.For<IGridQuery>();
            gridQuery.Query = HttpUtility.ParseQueryString(query);
            gridQuery.Grid.Name = gridName;

            Int32 actual = new GridPagingQuery(gridQuery).CurrentPage;
            Int32 expected = currentPage;

            Assert.AreEqual(expected, actual);
        }

        [Test]
        [TestCase("")]
        [TestCase(null)]
        [TestCase("Grid")]
        public void GridSortingQuery_SetsGridName(String gridName)
        {
            IGridQuery gridQuery = Substitute.For<IGridQuery>();
            gridQuery.Query = new NameValueCollection();
            gridQuery.Grid.Name = gridName;

            String actual = new GridPagingQuery(gridQuery).GridName;
            String expected = gridName;

            Assert.AreEqual(expected, actual);
        }

        #endregion
    }
}
